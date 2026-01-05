-- Migration: Create zip_codes table for Mexico postal codes
-- This table stores all postal codes, colonias, delegaciones/municipios, and states in Mexico

CREATE TABLE IF NOT EXISTS zip_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zip_code VARCHAR(5) NOT NULL,
  colonia VARCHAR(255) NOT NULL,
  delegacion_municipio VARCHAR(255) NOT NULL,
  estado VARCHAR(100) NOT NULL,
  ciudad VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_zip_codes_zip_code ON zip_codes(zip_code);
CREATE INDEX IF NOT EXISTS idx_zip_codes_estado ON zip_codes(estado);
CREATE INDEX IF NOT EXISTS idx_zip_codes_delegacion ON zip_codes(delegacion_municipio);
CREATE INDEX IF NOT EXISTS idx_zip_codes_colonia ON zip_codes(colonia);
CREATE INDEX IF NOT EXISTS idx_zip_codes_search ON zip_codes USING GIN (to_tsvector('spanish', colonia || ' ' || delegacion_municipio || ' ' || estado));

-- Enable RLS (Row Level Security)
ALTER TABLE zip_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Zip codes are publicly readable" ON zip_codes;
DROP POLICY IF EXISTS "Service role can modify zip codes" ON zip_codes;
DROP POLICY IF EXISTS "Only admins can modify zip codes" ON zip_codes;

-- Policy: Anyone can read zip codes (public data)
CREATE POLICY "Zip codes are publicly readable"
  ON zip_codes FOR SELECT
  USING (true);

-- Policy: Allow service role to insert/update/delete (for data import)
-- Note: Service role key bypasses RLS, so this policy allows authenticated users
CREATE POLICY "Service role can modify zip codes"
  ON zip_codes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: The above policy allows service role key to insert data
-- For production, you may want to restrict this further

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_zip_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS update_zip_codes_updated_at ON zip_codes;

CREATE TRIGGER update_zip_codes_updated_at
  BEFORE UPDATE ON zip_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_zip_codes_updated_at();

-- Add comment
COMMENT ON TABLE zip_codes IS 'Complete database of Mexico postal codes with colonias, delegaciones/municipios, and states';
COMMENT ON COLUMN zip_codes.zip_code IS '5-digit postal code';
COMMENT ON COLUMN zip_codes.colonia IS 'Neighborhood/colonia name';
COMMENT ON COLUMN zip_codes.delegacion_municipio IS 'Delegation (CDMX) or Municipality (other states)';
COMMENT ON COLUMN zip_codes.estado IS 'State name';
COMMENT ON COLUMN zip_codes.ciudad IS 'City name (optional)';

