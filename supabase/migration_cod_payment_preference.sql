-- Migration: Add cod_payment_preference to orders table (cash vs bring terminal)
-- Run this in Supabase SQL Editor

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cod_payment_preference TEXT;

COMMENT ON COLUMN orders.cod_payment_preference IS 'For COD orders with delivery/courier: cash vs terminal (cash|terminal)';

