// API Service for Hotel Mapping Operations
import { query, getClient, MasterHotel, SupplierHotel, PotentialMatch } from '../utils/database';
import { hotelMatcher, HotelRecord, MatchResult } from './hotelMatcher';

/**
 * Import a supplier hotel and attempt automatic mapping
 */
export async function importSupplierHotel(hotelData: {
  supplierCode: string;
  supplierHotelId: string;
  hotelName: string;
  addressLine1?: string;
  city?: string;
  countryCode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
}): Promise<{ success: boolean; supplierHotelId: number; message: string }> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Normalize name
    const normalizedName = hotelMatcher.normalizeName(hotelData.hotelName);
    
    // Insert or update supplier hotel
    const insertResult = await client.query<{ id: number }>(`
      INSERT INTO supplier_hotels (
        supplier_code, supplier_hotel_id, hotel_name, hotel_name_normalized,
        address_line1, city, country_code, postal_code,
        latitude, longitude, phone_number, mapping_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'unmapped')
      ON CONFLICT (supplier_code, supplier_hotel_id) 
      DO UPDATE SET
        hotel_name = EXCLUDED.hotel_name,
        address_line1 = EXCLUDED.address_line1,
        city = EXCLUDED.city,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      hotelData.supplierCode,
      hotelData.supplierHotelId,
      hotelData.hotelName,
      normalizedName,
      hotelData.addressLine1,
      hotelData.city,
      hotelData.countryCode,
      hotelData.postalCode,
      hotelData.latitude,
      hotelData.longitude,
      hotelData.phoneNumber,
    ]);
    
    const supplierHotelId = insertResult.rows[0].id;
    
    await client.query('COMMIT');
    
    // Attempt automatic matching (async, don't wait)
    attemptAutomaticMatching(supplierHotelId, hotelData.supplierCode).catch(console.error);
    
    return {
      success: true,
      supplierHotelId,
      message: 'Hotel imported successfully. Automatic matching in progress.'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing supplier hotel:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Attempt automatic matching for a supplier hotel
 */
async function attemptAutomaticMatching(
  supplierHotelId: number,
  supplierCode: string
): Promise<void> {
  try {
    // Get supplier hotel details
    const supplierResult = await query<SupplierHotel>(
      'SELECT * FROM supplier_hotels WHERE id = $1',
      [supplierHotelId]
    );
    
    if (supplierResult.rows.length === 0) return;
    
    const supplierHotel = supplierResult.rows[0];
    
    // Get potential master hotels (same country)
    const masterResult = await query<MasterHotel>(
      `SELECT * FROM master_hotels 
       WHERE country_code = $1 AND status = 'active'
       LIMIT 1000`,
      [supplierHotel.country_code]
    );
    
    const masterHotels = masterResult.rows;
    
    // Convert to HotelRecord format
    const supplierRecord: HotelRecord = {
      id: supplierHotel.id,
      name: supplierHotel.hotel_name,
      address: supplierHotel.address_line1,
      city: supplierHotel.city,
      countryCode: supplierHotel.country_code,
      postalCode: supplierHotel.postal_code,
      latitude: supplierHotel.latitude,
      longitude: supplierHotel.longitude,
      phone: supplierHotel.phone_number,
    };
    
    const masterRecords: HotelRecord[] = masterHotels.map(mh => ({
      id: mh.id,
      name: mh.hotel_name,
      address: mh.address_line1,
      city: mh.city,
      countryCode: mh.country_code,
      postalCode: mh.postal_code,
      latitude: mh.latitude,
      longitude: mh.longitude,
      phone: mh.phone_number,
    }));
    
    // Find matches
    const matches = hotelMatcher.matchSupplierHotel(supplierRecord, masterRecords);
    
    // Get recommendation
    const { action, bestMatch } = hotelMatcher.getMappingRecommendation(matches);
    
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      if (action === 'auto_map' && bestMatch) {
        // Automatically map with high confidence
        await client.query(`
          UPDATE supplier_hotels
          SET master_hotel_id = $1,
              mapping_status = 'auto_mapped',
              mapping_confidence_score = $2,
              mapping_method = $3,
              mapped_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [bestMatch.masterHotelId, bestMatch.confidenceScore, bestMatch.matchMethod, supplierHotelId]);
        
        // Log history
        await client.query(`
          INSERT INTO hotel_mapping_history (
            supplier_hotel_id, supplier_code, new_master_hotel_id,
            action, confidence_score, mapping_method, performed_by
          ) VALUES ($1, $2, $3, 'mapped', $4, $5, 'system')
        `, [supplierHotelId, supplierCode, bestMatch.masterHotelId, bestMatch.confidenceScore, bestMatch.matchMethod]);
        
      } else if (action === 'manual_review') {
        // Add to review queue
        for (const match of matches.slice(0, 5)) {
          await client.query(`
            INSERT INTO potential_hotel_matches (
              supplier_hotel_id, supplier_code, master_hotel_id,
              match_score, match_criteria, status
            ) VALUES ($1, $2, $3, $4, $5, 'pending')
            ON CONFLICT DO NOTHING
          `, [supplierHotelId, supplierCode, match.masterHotelId, match.confidenceScore, JSON.stringify(match.matchCriteria)]);
        }
        
        // Update status
        await client.query(`
          UPDATE supplier_hotels
          SET mapping_status = 'pending_review'
          WHERE id = $1
        `, [supplierHotelId]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in automatic matching:', error);
  }
}

/**
 * Get pending reviews
 */
export async function getPendingReviews(limit: number = 50): Promise<any[]> {
  const result = await query(`
    SELECT 
      sh.id,
      sh.supplier_code,
      sh.hotel_name,
      sh.city,
      sh.country_code,
      COUNT(pm.id) as potential_matches_count
    FROM supplier_hotels sh
    LEFT JOIN potential_hotel_matches pm ON sh.id = pm.supplier_hotel_id
      AND pm.status = 'pending'
    WHERE sh.mapping_status = 'pending_review'
    GROUP BY sh.id
    ORDER BY potential_matches_count DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}

/**
 * Get potential matches for a supplier hotel
 */
export async function getPotentialMatches(supplierHotelId: number): Promise<{
  supplierHotel: SupplierHotel;
  potentialMatches: any[];
}> {
  // Get supplier hotel
  const supplierResult = await query<SupplierHotel>(
    'SELECT * FROM supplier_hotels WHERE id = $1',
    [supplierHotelId]
  );
  
  if (supplierResult.rows.length === 0) {
    throw new Error('Supplier hotel not found');
  }
  
  // Get potential matches
  const matchesResult = await query(`
    SELECT 
      pm.*,
      mh.hotel_name,
      mh.address_line1,
      mh.city,
      mh.postal_code,
      mh.latitude,
      mh.longitude,
      mh.phone_number
    FROM potential_hotel_matches pm
    JOIN master_hotels mh ON pm.master_hotel_id = mh.id
    WHERE pm.supplier_hotel_id = $1 AND pm.status = 'pending'
    ORDER BY pm.match_score DESC
    LIMIT 10
  `, [supplierHotelId]);
  
  return {
    supplierHotel: supplierResult.rows[0],
    potentialMatches: matchesResult.rows
  };
}

/**
 * Manually map a supplier hotel to a master hotel
 */
export async function manualMapHotel(
  supplierHotelId: number,
  masterHotelId: number,
  performedBy: string = 'user'
): Promise<{ success: boolean; message: string }> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get current mapping
    const currentResult = await client.query<{ master_hotel_id: number | null; supplier_code: string }>(
      'SELECT master_hotel_id, supplier_code FROM supplier_hotels WHERE id = $1',
      [supplierHotelId]
    );
    
    if (currentResult.rows.length === 0) {
      throw new Error('Supplier hotel not found');
    }
    
    const { master_hotel_id: oldMasterId, supplier_code: supplierCode } = currentResult.rows[0];
    
    // Update mapping
    await client.query(`
      UPDATE supplier_hotels
      SET master_hotel_id = $1,
          mapping_status = 'manually_mapped',
          mapping_confidence_score = 1.0,
          mapping_method = 'manual',
          mapped_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [masterHotelId, supplierHotelId]);
    
    // Log history
    const action = oldMasterId ? 'remapped' : 'mapped';
    await client.query(`
      INSERT INTO hotel_mapping_history (
        supplier_hotel_id, supplier_code, old_master_hotel_id,
        new_master_hotel_id, action, confidence_score, mapping_method, performed_by
      ) VALUES ($1, $2, $3, $4, $5, 1.0, 'manual', $6)
    `, [supplierHotelId, supplierCode, oldMasterId, masterHotelId, action, performedBy]);
    
    // Mark potential matches as resolved
    await client.query(`
      UPDATE potential_hotel_matches
      SET status = CASE
        WHEN master_hotel_id = $1 THEN 'accepted'
        ELSE 'rejected'
      END
      WHERE supplier_hotel_id = $2 AND status = 'pending'
    `, [masterHotelId, supplierHotelId]);
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Hotel mapped successfully'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error mapping hotel:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a new master hotel from supplier data and map to it
 */
export async function createMasterAndMap(
  supplierHotelId: number,
  masterHotelData: {
    hotelName: string;
    addressLine1?: string;
    city?: string;
    countryCode?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    phoneNumber?: string;
  },
  performedBy: string = 'user'
): Promise<{ success: boolean; masterHotelId: number; message: string }> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Create master hotel
    const normalizedName = hotelMatcher.normalizeName(masterHotelData.hotelName);
    
    const masterResult = await client.query<{ id: number }>(`
      INSERT INTO master_hotels (
        hotel_name, hotel_name_normalized, address_line1,
        city, country_code, postal_code, latitude, longitude,
        phone_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
      RETURNING id
    `, [
      masterHotelData.hotelName,
      normalizedName,
      masterHotelData.addressLine1,
      masterHotelData.city,
      masterHotelData.countryCode,
      masterHotelData.postalCode,
      masterHotelData.latitude,
      masterHotelData.longitude,
      masterHotelData.phoneNumber,
    ]);
    
    const masterHotelId = masterResult.rows[0].id;
    
    // Map supplier hotel to new master
    await client.query(`
      UPDATE supplier_hotels
      SET master_hotel_id = $1,
          mapping_status = 'manually_mapped',
          mapping_confidence_score = 1.0,
          mapping_method = 'manual_new_master',
          mapped_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [masterHotelId, supplierHotelId]);
    
    // Get supplier code
    const supplierResult = await client.query<{ supplier_code: string }>(
      'SELECT supplier_code FROM supplier_hotels WHERE id = $1',
      [supplierHotelId]
    );
    
    // Log history
    await client.query(`
      INSERT INTO hotel_mapping_history (
        supplier_hotel_id, supplier_code, new_master_hotel_id,
        action, confidence_score, mapping_method, performed_by
      ) VALUES ($1, $2, $3, 'mapped', 1.0, 'manual_new_master', $4)
    `, [supplierHotelId, supplierResult.rows[0].supplier_code, masterHotelId, performedBy]);
    
    await client.query('COMMIT');
    
    return {
      success: true,
      masterHotelId,
      message: 'Master hotel created and mapped successfully'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating master hotel:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get mapping statistics
 */
export async function getMappingStats(): Promise<any> {
  const statsQueries = await Promise.all([
    query('SELECT COUNT(DISTINCT supplier_code) as total_suppliers FROM supplier_hotels'),
    query(`
      SELECT mapping_status, COUNT(*) as count
      FROM supplier_hotels
      GROUP BY mapping_status
    `),
    query(`
      SELECT 
        supplier_code,
        COUNT(*) as total_hotels,
        SUM(CASE WHEN master_hotel_id IS NOT NULL THEN 1 ELSE 0 END) as mapped_hotels,
        ROUND(
          SUM(CASE WHEN master_hotel_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
          2
        ) as mapping_percentage
      FROM supplier_hotels
      GROUP BY supplier_code
    `),
    query(`
      SELECT COUNT(*) as pending_reviews
      FROM supplier_hotels
      WHERE mapping_status = 'pending_review'
    `),
  ]);
  
  return {
    totalSuppliers: statsQueries[0].rows[0].total_suppliers,
    byStatus: statsQueries[1].rows,
    bySupplier: statsQueries[2].rows,
    pendingReviews: statsQueries[3].rows[0].pending_reviews,
  };
}

/**
 * Get all master hotels
 */
export async function getAllMasterHotels(): Promise<MasterHotel[]> {
  const result = await query<MasterHotel>(`
    SELECT * FROM master_hotels
    WHERE status = 'active'
    ORDER BY hotel_name
  `);
  
  return result.rows;
}
