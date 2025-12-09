-- Migration: Add guest checkout support to orders table
-- Run this in Supabase SQL Editor

-- Step 1: Make user_id nullable
ALTER TABLE orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Add guest checkout fields
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guest_address JSONB;

-- Step 3: Add index for guest email lookups
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);

-- Step 4: Update RLS policies to allow guest orders
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
CREATE POLICY "Users and guests can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL -- Allow guest checkout
  );

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = vendor_id 
    OR user_id IS NULL -- Guest orders
  );

-- Step 5: Update order_items policy
DROP POLICY IF EXISTS "Order items can be inserted with order" ON order_items;
CREATE POLICY "Order items can be inserted with order"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR orders.user_id IS NULL) -- Allow guest orders
    )
  );

