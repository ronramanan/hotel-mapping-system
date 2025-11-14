// Database connection utility for PostgreSQL
import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration from environment variables
const dbConfig = {
  host: process.env.REACT_APP_DB_HOST || 'localhost',
  port: parseInt(process.env.REACT_APP_DB_PORT || '5432'),
  database: process.env.REACT_APP_DB_NAME || 'hotelmapping',
  user: process.env.REACT_APP_DB_USER || 'postgres',
  password: process.env.REACT_APP_DB_PASSWORD || '',
  ssl: process.env.REACT_APP_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create a connection pool
let pool: Pool | null = null;

/**
 * Get database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig);
    
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  
  return pool;
}

/**
 * Execute a query
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Close all connections
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Initialize database schema
 */
export async function initializeSchema(): Promise<void> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create master_hotels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_hotels (
        id SERIAL PRIMARY KEY,
        hotel_name VARCHAR(500) NOT NULL,
        hotel_name_normalized VARCHAR(500),
        address_line1 VARCHAR(500),
        city VARCHAR(200),
        country_code CHAR(2),
        postal_code VARCHAR(20),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        phone_number VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create supplier_hotels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_hotels (
        id SERIAL PRIMARY KEY,
        supplier_code VARCHAR(50) NOT NULL,
        supplier_hotel_id VARCHAR(255) NOT NULL,
        master_hotel_id INTEGER REFERENCES master_hotels(id),
        hotel_name VARCHAR(500) NOT NULL,
        hotel_name_normalized VARCHAR(500),
        address_line1 VARCHAR(500),
        city VARCHAR(200),
        country_code CHAR(2),
        postal_code VARCHAR(20),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        phone_number VARCHAR(50),
        mapping_status VARCHAR(20) DEFAULT 'unmapped',
        mapping_confidence_score DECIMAL(5,4),
        mapping_method VARCHAR(50),
        mapped_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(supplier_code, supplier_hotel_id)
      )
    `);
    
    // Create mapping_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hotel_mapping_history (
        id SERIAL PRIMARY KEY,
        supplier_hotel_id INTEGER REFERENCES supplier_hotels(id),
        supplier_code VARCHAR(50),
        old_master_hotel_id INTEGER,
        new_master_hotel_id INTEGER,
        action VARCHAR(20),
        confidence_score DECIMAL(5,4),
        mapping_method VARCHAR(50),
        performed_by VARCHAR(100),
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create potential_matches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS potential_hotel_matches (
        id SERIAL PRIMARY KEY,
        supplier_hotel_id INTEGER REFERENCES supplier_hotels(id),
        supplier_code VARCHAR(50),
        master_hotel_id INTEGER REFERENCES master_hotels(id),
        match_score DECIMAL(5,4),
        match_criteria JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_supplier_status ON supplier_hotels(mapping_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_supplier_master ON supplier_hotels(master_hotel_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_matches_supplier ON potential_hotel_matches(supplier_hotel_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_matches_status ON potential_hotel_matches(status)');
    
    await client.query('COMMIT');
    console.log('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export types
export interface MasterHotel {
  id: number;
  hotel_name: string;
  hotel_name_normalized?: string;
  address_line1?: string;
  city?: string;
  country_code?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  phone_number?: string;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface SupplierHotel {
  id: number;
  supplier_code: string;
  supplier_hotel_id: string;
  master_hotel_id?: number;
  hotel_name: string;
  hotel_name_normalized?: string;
  address_line1?: string;
  city?: string;
  country_code?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  phone_number?: string;
  mapping_status?: string;
  mapping_confidence_score?: number;
  mapping_method?: string;
  mapped_at?: Date;
  created_at?: Date;
}

export interface MappingHistory {
  id: number;
  supplier_hotel_id: number;
  supplier_code: string;
  old_master_hotel_id?: number;
  new_master_hotel_id?: number;
  action: string;
  confidence_score?: number;
  mapping_method?: string;
  performed_by?: string;
  performed_at?: Date;
}

export interface PotentialMatch {
  id: number;
  supplier_hotel_id: number;
  supplier_code: string;
  master_hotel_id: number;
  match_score: number;
  match_criteria?: any;
  status: string;
  created_at?: Date;
}
