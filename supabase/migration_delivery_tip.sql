-- Migration: Add delivery and tip fields to orders table

-- Add delivery and tip columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_option VARCHAR(50),
ADD COLUMN IF NOT EXISTS delivery_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN orders.delivery_option IS 'Delivery option: same_day or on_demand';
COMMENT ON COLUMN orders.delivery_cost IS 'Cost of delivery in MXN';
COMMENT ON COLUMN orders.tip_amount IS 'Tip amount for delivery driver in MXN';

