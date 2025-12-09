-- Fix RLS policies for site_config table
-- Run this if you're getting permission errors even though you're an admin

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read site config" ON site_config;
DROP POLICY IF EXISTS "Only admins can insert site config" ON site_config;
DROP POLICY IF EXISTS "Only admins can update site config" ON site_config;
DROP POLICY IF EXISTS "Only admins can delete site config" ON site_config;
DROP POLICY IF EXISTS "Only admins can modify site config" ON site_config;

-- Drop and recreate the is_admin function
DROP FUNCTION IF EXISTS is_admin();

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

-- Recreate policies using the function
CREATE POLICY "Anyone can read site config"
  ON site_config FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert site config"
  ON site_config FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update site config"
  ON site_config FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete site config"
  ON site_config FOR DELETE
  USING (is_admin());

-- Test the function (should return true if you're logged in as admin)
-- SELECT is_admin();

