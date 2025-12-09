-- Fix RLS policies for addresses table
-- This ensures that auth.uid() is properly accessible in RLS policies
-- Run this in Supabase SQL Editor after running migration_addresses.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON addresses;

-- Recreate policies with better error handling
-- Users can read their own addresses
CREATE POLICY "Users can read their own addresses"
  ON addresses FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can insert their own addresses
-- WITH CHECK ensures the user_id matches the authenticated user
CREATE POLICY "Users can insert their own addresses"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can update their own addresses
CREATE POLICY "Users can update their own addresses"
  ON addresses FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses"
  ON addresses FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

