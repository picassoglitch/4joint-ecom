-- Migration: Create store_requests table for users interested in becoming vendors
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS store_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_store_requests_user_id ON store_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_store_requests_status ON store_requests(status);
CREATE INDEX IF NOT EXISTS idx_store_requests_created_at ON store_requests(created_at DESC);

-- Add comment
COMMENT ON TABLE store_requests IS 'Stores requests from users who want to become vendors';
COMMENT ON COLUMN store_requests.status IS 'Status: pending, reviewed, approved, rejected';




