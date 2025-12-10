-- Fix RLS policies for coupons table
-- Run this if you're getting "permission denied for table users" errors

-- Step 1: Create or replace the is_admin function if it doesn't exist
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

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "Public coupons are viewable by everyone" ON coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can insert coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can update coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can delete coupons" ON coupons;

-- Step 3: Recreate policies using the function
-- Policy: Everyone can read public coupons or non-expired coupons
CREATE POLICY "Public coupons are viewable by everyone"
  ON coupons FOR SELECT
  USING (is_public = true OR expires_at > NOW());

-- Policy: Admins can insert coupons
CREATE POLICY "Admins can insert coupons"
  ON coupons FOR INSERT
  WITH CHECK (is_admin());

-- Policy: Admins can update coupons
CREATE POLICY "Admins can update coupons"
  ON coupons FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy: Admins can delete coupons
CREATE POLICY "Admins can delete coupons"
  ON coupons FOR DELETE
  USING (is_admin());

-- Test the function (should return true if you're logged in as admin)
-- SELECT is_admin();

