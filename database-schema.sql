-- Hotel Mapping System - PostgreSQL Schema
-- For AWS RDS PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Master Hotels Table
CREATE TABLE IF NOT EXISTS master_hotels (
    id SERIAL PRIMARY KEY,
    hotel_name VARCHAR(500) NOT NULL,
    hotel_name_normalized VARCHAR(500),
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(200),
    state_province VARCHAR(100),
    country_code CHAR(2),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    website_url VARCHAR(500),
    star_rating DECIMAL(2,1),
    property_type VARCHAR(50),
    chain_code VARCHAR(10),
    chain_name VARCHAR(200),
    amenities JSONB,
    description TEXT,
    total_rooms INTEGER,
    check_in_time TIME,
    check_out_time TIME,
    images JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_verified_at TIMESTAMP,
    data_source VARCHAR(50)
);

-- Indexes for master_hotels
CREATE INDEX IF NOT EXISTS idx_master_name_normalized ON master_hotels(hotel_name_normalized);
CREATE INDEX IF NOT EXISTS idx_master_city_country ON master_hotels(city, country_code);
CREATE INDEX IF NOT EXISTS idx_master_postal_code ON master_hotels(postal_code);
CREATE INDEX IF NOT EXISTS idx_master_chain ON master_hotels(chain_code);
CREATE INDEX IF NOT EXISTS idx_master_location ON master_hotels(latitude, longitude);

-- Supplier Hotels Table
CREATE TABLE IF NOT EXISTS supplier_hotels (
    id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) NOT NULL,
    supplier_hotel_id VARCHAR(255) NOT NULL,
    master_hotel_id INTEGER REFERENCES master_hotels(id) ON DELETE SET NULL,
    hotel_name VARCHAR(500) NOT NULL,
    hotel_name_normalized VARCHAR(500),
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(200),
    state_province VARCHAR(100),
    country_code CHAR(2),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone_number VARCHAR(50),
    website_url VARCHAR(500),
    star_rating DECIMAL(2,1),
    supplier_specific_data JSONB,
    mapping_status VARCHAR(20) DEFAULT 'unmapped',
    mapping_confidence_score DECIMAL(5,4),
    mapping_method VARCHAR(50),
    mapped_at TIMESTAMP,
    mapped_by VARCHAR(100),
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supplier_code, supplier_hotel_id)
);

-- Indexes for supplier_hotels
CREATE INDEX IF NOT EXISTS idx_supplier_master ON supplier_hotels(master_hotel_id);
CREATE INDEX IF NOT EXISTS idx_supplier_status ON supplier_hotels(mapping_status);
CREATE INDEX IF NOT EXISTS idx_supplier_code ON supplier_hotels(supplier_code);
CREATE INDEX IF NOT EXISTS idx_supplier_location ON supplier_hotels(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_supplier_name_normalized ON supplier_hotels(hotel_name_normalized);

-- Mapping History Table
CREATE TABLE IF NOT EXISTS hotel_mapping_history (
    id SERIAL PRIMARY KEY,
    supplier_hotel_id INTEGER NOT NULL REFERENCES supplier_hotels(id) ON DELETE CASCADE,
    supplier_code VARCHAR(50) NOT NULL,
    old_master_hotel_id INTEGER,
    new_master_hotel_id INTEGER,
    action VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(5,4),
    mapping_method VARCHAR(50),
    reason TEXT,
    performed_by VARCHAR(100),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for mapping_history
CREATE INDEX IF NOT EXISTS idx_history_supplier ON hotel_mapping_history(supplier_hotel_id);
CREATE INDEX IF NOT EXISTS idx_history_action_date ON hotel_mapping_history(action, performed_at);

-- Potential Matches Queue
CREATE TABLE IF NOT EXISTS potential_hotel_matches (
    id SERIAL PRIMARY KEY,
    supplier_hotel_id INTEGER NOT NULL REFERENCES supplier_hotels(id) ON DELETE CASCADE,
    supplier_code VARCHAR(50) NOT NULL,
    master_hotel_id INTEGER NOT NULL REFERENCES master_hotels(id) ON DELETE CASCADE,
    match_score DECIMAL(5,4) NOT NULL,
    match_criteria JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for potential_matches
CREATE INDEX IF NOT EXISTS idx_matches_supplier ON potential_hotel_matches(supplier_hotel_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON potential_hotel_matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_score ON potential_hotel_matches(match_score DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_master_hotels_updated_at BEFORE UPDATE ON master_hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_hotels_updated_at BEFORE UPDATE ON supplier_hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
INSERT INTO master_hotels (hotel_name, hotel_name_normalized, address_line1, city, country_code, postal_code, latitude, longitude, status)
VALUES 
    ('Hilton Garden Inn New York Downtown', 'hilton garden inn new york downtown', '123 Broadway', 'New York', 'US', '10013', 40.7831, -73.9712, 'active'),
    ('Marriott Marquis Times Square', 'marriott marquis times square', '1535 Broadway', 'New York', 'US', '10036', 40.7589, -73.9851, 'active')
ON CONFLICT DO NOTHING;
