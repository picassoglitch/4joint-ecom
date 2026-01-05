-- Migration: Add require_order_approval field to vendors table
-- This allows vendors to require manual approval before processing orders

-- Add require_order_approval column to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS require_order_approval BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN vendors.require_order_approval IS 'If true, vendor must manually approve orders before they are processed. Orders will remain in ORDER_PLACED status until approved.';

