-- ============================================
-- MIGRATION: Telegram Notifications System
-- ============================================
-- This migration adds Telegram notification support for stores
-- Run this in Supabase SQL Editor

-- Step 1: Add Telegram fields to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"newOrder": true, "lowStock": true, "support": true}'::jsonb;

-- Add comments
COMMENT ON COLUMN vendors.telegram_username IS 'Telegram username (optional, for reference)';
COMMENT ON COLUMN vendors.telegram_chat_id IS 'Telegram chat ID stored after user connects via bot';
COMMENT ON COLUMN vendors.telegram_enabled IS 'Whether Telegram notifications are enabled for this store';
COMMENT ON COLUMN vendors.notification_prefs IS 'Notification preferences: newOrder, lowStock, support, etc.';

-- Step 2: Create telegram_connect_tokens table for one-time connection tokens
CREATE TABLE IF NOT EXISTS public.telegram_connect_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Step 3: Create indexes for telegram_connect_tokens
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_store_id ON public.telegram_connect_tokens(store_id);
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_token ON public.telegram_connect_tokens(token);
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_expires_at ON public.telegram_connect_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_used_at ON public.telegram_connect_tokens(used_at) WHERE used_at IS NULL;

-- Step 4: Enable Row Level Security on telegram_connect_tokens
ALTER TABLE public.telegram_connect_tokens ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for telegram_connect_tokens
-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Store owners can create tokens for their store" ON public.telegram_connect_tokens;
DROP POLICY IF EXISTS "Store owners can view their own tokens" ON public.telegram_connect_tokens;
DROP POLICY IF EXISTS "Allow token updates for webhook" ON public.telegram_connect_tokens;

-- Policy: Store owners can create tokens for their own store
-- Note: vendors.id IS the user_id (it references auth.users(id))
CREATE POLICY "Store owners can create tokens for their store"
ON public.telegram_connect_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendors
    WHERE vendors.id = store_id
    AND vendors.id = auth.uid()
  )
);

-- Policy: Store owners can view their own tokens
CREATE POLICY "Store owners can view their own tokens"
ON public.telegram_connect_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendors
    WHERE vendors.id = store_id
    AND vendors.id = auth.uid()
  )
);

-- Policy: Webhook can update tokens (used_at) - requires service role or special handling
-- Note: Webhook will use service role key, so we allow updates for unauthenticated requests
-- In production, webhook should verify Telegram secret token
CREATE POLICY "Allow token updates for webhook"
ON public.telegram_connect_tokens
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 6: Create telegram_notification_logs table for tracking sends
CREATE TABLE IF NOT EXISTS public.telegram_notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  chat_id VARCHAR(100) NOT NULL,
  message_text TEXT NOT NULL,
  notification_type VARCHAR(50), -- 'newOrder', 'lowStock', 'support', 'test', etc.
  success BOOLEAN NOT NULL,
  error_message TEXT,
  telegram_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create indexes for telegram_notification_logs
CREATE INDEX IF NOT EXISTS idx_telegram_logs_store_id ON public.telegram_notification_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_telegram_logs_created_at ON public.telegram_notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_logs_success ON public.telegram_notification_logs(success);

-- Step 8: Enable Row Level Security on telegram_notification_logs
ALTER TABLE public.telegram_notification_logs ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for telegram_notification_logs
-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Store owners can view their notification logs" ON public.telegram_notification_logs;

-- Policy: Store owners can view their own notification logs
-- Note: vendors.id IS the user_id (it references auth.users(id))
CREATE POLICY "Store owners can view their notification logs"
ON public.telegram_notification_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendors
    WHERE vendors.id = store_id
    AND vendors.id = auth.uid()
  )
);

-- Step 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.telegram_connect_tokens TO authenticated;
GRANT ALL ON public.telegram_notification_logs TO authenticated;

-- ============================================
-- VERIFICATION QUERY (Optional - run to verify)
-- ============================================
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_name IN ('vendors', 'telegram_connect_tokens', 'telegram_notification_logs')
-- ORDER BY table_name, ordinal_position;

