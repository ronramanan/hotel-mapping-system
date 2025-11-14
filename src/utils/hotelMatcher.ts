// Hotel Matching Algorithm - TypeScript
// Fuzzy matching logic for hotel mapping

export interface HotelRecord {
  id: number;
  name: string;
  address?: string;
  city?: string;
  countryCode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  chainCode?: string;
}

export interface MatchResult {
  masterHotelId: number;
  confidenceScore: number;
  matchMethod: string;
  matchCriteria: {
    nameSimilarity?: number;
    distanceMeters?: number;
    distanceScore?: number;
    addressSimilarity?: number;
    postalCodeMatch?: boolean;
    phoneMatch?: boolean;
    chainMatch?: boolean;
    [key: string]: any;
  };
}

export interface MatcherConfig {
  weights: {
    nameSimilarity: number;
    distance: number;
    address: number;
    postalCode: number;
    other: number;
  };
  thresholds: {
    autoAccept: number;
    manualReviewMin: number;
    reject: number;
  };
  distanceThresholds: {
    exact: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

export class HotelMatcher {
  private config: MatcherConfig;

  constructor(config?: Partial<MatcherConfig>) {
    this.config = {
      weights: {
        nameSimilarity: 0.40,
        distance: 0.30,
        address: 0.15,
        postalCode: 0.10,
        other: 0.05,
      },
      thresholds: {
        autoAccept: 0.90,
        manualReviewMin: 0.60,
        reject: 0.40,
      },
      distanceThresholds: {
        exact: 50,
        highConfidence: 100,
        mediumConfidence: 200,
        lowConfidence: 500,
      },
      ...config,
    };
  }

  /**
   * Normalize hotel name for comparison
   */
  normalizeName(name: string): string {
    if (!name) return '';

    let normalized = name.toLowerCase();

    // Remove common hotel terms
    const removeTerms = [
      /\bthe\b/g,
      /\bhotel\b/g,
      /\binn\b/g,
      /\bresort\b/g,
      /\bsuites?\b/g,
      /\blodge\b/g,
      /\bmotel\b/g,
      /\bhostel\b/g,
      /\bby\b/g,
      /\band\b/g,
    ];

    removeTerms.forEach((term) => {
      normalized = normalized.replace(term, '');
    });

    // Remove special characters but keep spaces
    normalized = normalized.replace(/[^\w\s]/g, '');

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Standardize abbreviations
    const abbreviations: { [key: string]: string } = {
      ' st ': ' street ',
      ' rd ': ' road ',
      ' ave ': ' avenue ',
      ' blvd ': ' boulevard ',
      ' intl ': ' international ',
      ' ctr ': ' center ',
      ' ctre ': ' centre ',
      ' apt ': ' apartment ',
    };

    Object.entries(abbreviations).forEach(([abbr, full]) => {
      normalized = normalized.replace(new RegExp(abbr, 'g'), full);
    });

    return normalized;
  }

  /**
   * Calculate similarity between two strings using Levenshtein-like algorithm
   */
  calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate name similarity with token matching
   */
  calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;

    const norm1 = this.normalizeName(name1);
    const norm2 = this.normalizeName(name2);

    // Exact match after normalization
    if (norm1 === norm2) return 1.0;

    // Sequence similarity
    const sequenceSimilarity = this.calculateStringSimilarity(norm1, norm2);

    // Token-based matching
    const tokens1 = new Set(norm1.split(' ').filter((t) => t.length > 0));
    const tokens2 = new Set(norm2.split(' ').filter((t) => t.length > 0));

    if (tokens1.size === 0 || tokens2.size === 0) {
      return sequenceSimilarity;
    }

    const intersection = new Set(
      [...tokens1].filter((x) => tokens2.has(x))
    );
    const union = new Set([...tokens1, ...tokens2]);

    const tokenScore = intersection.size / union.size;

    // Weighted combination
    return sequenceSimilarity * 0.6 + tokenScore * 0.4;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters

    const toRad = (degrees: number) => (degrees * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Convert distance to score
   */
  calculateDistanceScore(distanceMeters: number): number {
    if (distanceMeters === Infinity) return 0;

    const { exact, highConfidence, mediumConfidence, lowConfidence } =
      this.config.distanceThresholds;

    if (distanceMeters <= exact) return 1.0;
    if (distanceMeters <= highConfidence) return 0.95;
    if (distanceMeters <= mediumConfidence) return 0.85;
    if (distanceMeters <= lowConfidence) return 0.70;

    // Exponential decay after 500m
    return Math.max(0, 0.7 * Math.exp(-(distanceMeters - 500) / 1000));
  }

  /**
   * Calculate address similarity
   */
  calculateAddressSimilarity(addr1?: string, addr2?: string): number {
    if (!addr1 || !addr2) return 0;

    const norm1 = addr1.toLowerCase().replace(/[^\w\s]/g, '');
    const norm2 = addr2.toLowerCase().replace(/[^\w\s]/g, '');

    return this.calculateStringSimilarity(norm1, norm2);
  }

  /**
   * Match supplier hotel against master hotels
   */
  matchSupplierHotel(
    supplierHotel: HotelRecord,
    masterHotels: HotelRecord[]
  ): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const masterHotel of masterHotels) {
      const matchCriteria: MatchResult['matchCriteria'] = {};
      const scoreComponents: number[] = [];

      // 1. Name similarity (40%)
      const nameSim = this.calculateNameSimilarity(
        supplierHotel.name,
        masterHotel.name
      );
      matchCriteria.nameSimilarity = nameSim;
      scoreComponents.push(nameSim * this.config.weights.nameSimilarity);

      // 2. Geographic distance (30%)
      if (
        supplierHotel.latitude &&
        supplierHotel.longitude &&
        masterHotel.latitude &&
        masterHotel.longitude
      ) {
        const distance = this.calculateDistance(
          supplierHotel.latitude,
          supplierHotel.longitude,
          masterHotel.latitude,
          masterHotel.longitude
        );
        const distanceScore = this.calculateDistanceScore(distance);
        matchCriteria.distanceMeters = Math.round(distance);
        matchCriteria.distanceScore = distanceScore;
        scoreComponents.push(distanceScore * this.config.weights.distance);
      }

      // 3. Address similarity (15%)
      if (supplierHotel.address && masterHotel.address) {
        const addrSim = this.calculateAddressSimilarity(
          supplierHotel.address,
          masterHotel.address
        );
        matchCriteria.addressSimilarity = addrSim;
        scoreComponents.push(addrSim * this.config.weights.address);
      }

      // 4. Postal code match (10%)
      if (supplierHotel.postalCode && masterHotel.postalCode) {
        const postalMatch =
          supplierHotel.postalCode.replace(/\s/g, '').toLowerCase() ===
          masterHotel.postalCode.replace(/\s/g, '').toLowerCase();
        matchCriteria.postalCodeMatch = postalMatch;
        scoreComponents.push(
          (postalMatch ? 1.0 : 0.0) * this.config.weights.postalCode
        );
      }

      // 5. Other factors (5%)
      let otherScore = 0;

      // Phone match
      if (supplierHotel.phone && masterHotel.phone) {
        const phone1 = supplierHotel.phone.replace(/\D/g, '').slice(-7);
        const phone2 = masterHotel.phone.replace(/\D/g, '').slice(-7);
        const phoneMatch = phone1 === phone2 && phone1.length === 7;
        matchCriteria.phoneMatch = phoneMatch;
        if (phoneMatch) otherScore += 0.5;
      }

      // Chain match
      if (
        supplierHotel.chainCode &&
        masterHotel.chainCode &&
        supplierHotel.chainCode === masterHotel.chainCode
      ) {
        matchCriteria.chainMatch = true;
        otherScore += 0.5;
      }

      // Country mismatch penalty
      if (
        supplierHotel.countryCode &&
        masterHotel.countryCode &&
        supplierHotel.countryCode !== masterHotel.countryCode
      ) {
        matchCriteria.countryMismatch = true;
        otherScore = 0;
      }

      scoreComponents.push(otherScore * this.config.weights.other);

      // Calculate final confidence score
      const confidenceScore = scoreComponents.reduce((a, b) => a + b, 0);

      // Determine match method
      const matchMethod = this.determineMatchMethod(matchCriteria, confidenceScore);

      // Only include matches above rejection threshold
      if (confidenceScore >= this.config.thresholds.reject) {
        matches.push({
          masterHotelId: masterHotel.id,
          confidenceScore,
          matchMethod,
          matchCriteria,
        });
      }
    }

    // Sort by confidence score (highest first)
    matches.sort((a, b) => b.confidenceScore - a.confidenceScore);

    return matches;
  }

  /**
   * Determine the matching method based on criteria
   */
  private determineMatchMethod(
    criteria: MatchResult['matchCriteria'],
    score: number
  ): string {
    // Exact matches
    if (
      criteria.nameSimilarity === 1.0 &&
      criteria.postalCodeMatch === true
    ) {
      return 'exact_name_postal';
    }

    if (
      criteria.nameSimilarity === 1.0 &&
      criteria.distanceMeters !== undefined &&
      criteria.distanceMeters <= 50
    ) {
      return 'exact_name_geo';
    }

    // High confidence fuzzy matches
    if (score >= 0.90) {
      return 'high_confidence_fuzzy';
    }

    if (
      criteria.distanceMeters !== undefined &&
      criteria.distanceMeters <= 100 &&
      criteria.nameSimilarity !== undefined &&
      criteria.nameSimilarity >= 0.85
    ) {
      return 'fuzzy_name_geo';
    }

    // Medium confidence
    if (score >= 0.70) {
      return 'medium_confidence_fuzzy';
    }

    // Geographic proximity
    if (
      criteria.distanceMeters !== undefined &&
      criteria.distanceMeters <= 200
    ) {
      return 'geographic_proximity';
    }

    return 'low_confidence';
  }

  /**
   * Get mapping recommendation
   */
  getMappingRecommendation(
    matches: MatchResult[]
  ): { action: string; bestMatch: MatchResult | null } {
    if (matches.length === 0) {
      return { action: 'create_new', bestMatch: null };
    }

    const bestMatch = matches[0];

    if (bestMatch.confidenceScore >= this.config.thresholds.autoAccept) {
      return { action: 'auto_map', bestMatch };
    }

    if (bestMatch.confidenceScore >= this.config.thresholds.manualReviewMin) {
      return { action: 'manual_review', bestMatch };
    }

    return { action: 'create_new', bestMatch: null };
  }
}

// Export singleton instance
export const hotelMatcher = new HotelMatcher();
