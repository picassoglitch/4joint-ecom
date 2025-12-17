-- Migration: Location-based marketplace features
-- Adds user location, store location/fulfillment, and order dispatch fields

-- 1. Create user_profiles table for storing user location data
-- This table references auth.users (similar to vendors table)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_place TEXT,
  has_completed_onboarding BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- 2. Add location and fulfillment fields to stores/vendors table
-- Note: Assuming stores are in 'vendors' table based on codebase
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS service_radius_km DOUBLE PRECISION DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS fulfillment_modes JSONB DEFAULT '{"pickup": false, "delivery": false, "meetupPoint": false}'::jsonb,
ADD COLUMN IF NOT EXISTS meetup_points JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS min_order DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee_policy TEXT, -- "flat", "percent", "included"
ADD COLUMN IF NOT EXISTS delivery_fee_amount DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee_percent DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS courier_cost DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS courier_cost_included BOOLEAN DEFAULT false;

-- Create index for location queries on stores
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Add fulfillment and dispatch fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS fulfillment_type TEXT, -- "pickup", "delivery", "meetupPoint", "courierExterno"
ADD COLUMN IF NOT EXISTS meetup_point_id TEXT,
ADD COLUMN IF NOT EXISTS courier_cost DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'pending', -- "pending", "dispatched", "completed"
ADD COLUMN IF NOT EXISTS dispatch_notes TEXT;

-- Add DISPATCHED status to order_status enum if it doesn't exist
-- Note: This depends on how your enum is defined. If using text, no change needed.
-- If using actual enum type, you may need: ALTER TYPE order_status ADD VALUE 'DISPATCHED';

-- 4. Create function to calculate distance (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    earth_radius_km DOUBLE PRECISION := 6371.0;
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    -- Convert degrees to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    -- Haversine formula
    a := sin(dlat / 2) * sin(dlat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon / 2) * sin(dlon / 2);
    
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    
    RETURN earth_radius_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Create function to get nearby stores
CREATE OR REPLACE FUNCTION get_nearby_stores(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    max_distance_km DOUBLE PRECISION DEFAULT 50.0,
    fulfillment_filter TEXT DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    fulfillment_modes JSONB,
    min_order DOUBLE PRECISION,
    is_active BOOLEAN,
    logo TEXT,
    email TEXT,
    contact TEXT,
    address TEXT,
    operating_hours JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.name,
        v.description,
        v.latitude,
        v.longitude,
        calculate_distance(user_lat, user_lon, v.latitude, v.longitude) AS distance_km,
        v.fulfillment_modes,
        v.min_order,
        v.approved AS is_active, -- Using approved as is_active
        v.logo,
        v.email,
        v.contact,
        v.address,
        v.operating_hours
    FROM vendors v
    WHERE 
        v.latitude IS NOT NULL 
        AND v.longitude IS NOT NULL
        AND v.approved = true -- Only approved stores
        AND calculate_distance(user_lat, user_lon, v.latitude, v.longitude) <= max_distance_km
        AND (
            fulfillment_filter IS NULL 
            OR (
                (fulfillment_filter = 'pickup' AND (v.fulfillment_modes->>'pickup')::boolean = true)
                OR (fulfillment_filter = 'delivery' AND (v.fulfillment_modes->>'delivery')::boolean = true)
                OR (fulfillment_filter = 'meetupPoint' AND (v.fulfillment_modes->>'meetupPoint')::boolean = true)
            )
        )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Enable RLS policies (if needed)
-- Note: Adjust based on your existing RLS setup

-- Allow users to read their own location
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can read own location" ON users FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own location
-- CREATE POLICY "Users can update own location" ON users FOR UPDATE USING (auth.uid() = id);

-- Allow public to read approved stores (for store finder)
-- CREATE POLICY "Public can read approved stores" ON vendors FOR SELECT USING (approved = true);

COMMENT ON FUNCTION calculate_distance IS 'Calculates distance between two lat/lng points using Haversine formula (returns km)';
COMMENT ON FUNCTION get_nearby_stores IS 'Returns stores within max_distance_km, optionally filtered by fulfillment type';

