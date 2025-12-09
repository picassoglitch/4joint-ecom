-- Migration: Add telegram_chat_id to vendors table for notifications
-- Run this in Supabase SQL Editor

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);

-- Add comment
COMMENT ON COLUMN vendors.telegram_chat_id IS 'Telegram chat ID for receiving order notifications';

