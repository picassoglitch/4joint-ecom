-- Migration: Add telegram_user_id to vendors table for direct customer contact
-- Run this in Supabase SQL Editor

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS telegram_user_id VARCHAR(255);

-- Add comment
COMMENT ON COLUMN vendors.telegram_user_id IS 'Telegram username (with @) or user ID for direct customer contact after purchase';


