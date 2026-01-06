-- Migration: Add RLS policies for store_requests table
-- Run this in Supabase SQL Editor after creating the store_requests table

-- Enable RLS on store_requests table
ALTER TABLE store_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own store requests
CREATE POLICY "Users can insert their own store requests"
ON store_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all store requests
CREATE POLICY "Admins can view all store requests"
ON store_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Admins can update store requests
CREATE POLICY "Admins can update store requests"
ON store_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Users can view their own store requests
CREATE POLICY "Users can view their own store requests"
ON store_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);





