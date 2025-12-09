-- Migration: Site configuration table for admin to manage site settings
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS site_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO site_config (key, value, description) VALUES
  ('hero', '{"title": "Productos 420 que amas. Precios que confías.", "bannerImage": "", "showPrice": false}'::jsonb, 'Hero section configuration'),
  ('social_media', '{"facebook": "", "instagram": "", "twitter": "", "linkedin": "", "tiktok": "", "youtube": ""}'::jsonb, 'Social media links'),
  ('footer_products', '[]'::jsonb, 'Product categories for footer (auto-generated from products)')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Create a function to check if current user is admin
-- This function can be called from RLS policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Anyone can read site config
CREATE POLICY "Anyone can read site config"
  ON site_config FOR SELECT
  USING (true);

-- Policy for INSERT (admins only)
-- Using the function for better reliability
CREATE POLICY "Only admins can insert site config"
  ON site_config FOR INSERT
  WITH CHECK (is_admin());

-- Policy for UPDATE (admins only)
CREATE POLICY "Only admins can update site config"
  ON site_config FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy for DELETE (admins only)
CREATE POLICY "Only admins can delete site config"
  ON site_config FOR DELETE
  USING (is_admin());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_site_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON site_config
  FOR EACH ROW
  EXECUTE FUNCTION update_site_config_updated_at();

