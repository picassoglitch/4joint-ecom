-- Migration: Add Mercado Pago payment fields to orders table

-- Add payment_id and payment_provider columns
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'COD';

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_id IS 'Payment ID from payment provider (e.g., Mercado Pago payment ID)';
COMMENT ON COLUMN orders.payment_provider IS 'Payment provider: COD, MERCADOPAGO, etc.';

-- Update existing orders to have COD as default provider
UPDATE orders
SET payment_provider = 'COD'
WHERE payment_provider IS NULL;

