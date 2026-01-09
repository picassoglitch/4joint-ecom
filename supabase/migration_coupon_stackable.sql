-- Migration: Add stackable_with_promotions field to coupons table
-- This field indicates if a coupon can be used with other promotions (like free shipping threshold)

-- Add stackable_with_promotions field to coupons table
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS stackable_with_promotions BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN coupons.stackable_with_promotions IS 'Indica si el cupón puede usarse junto con otras promociones (ej: envío gratis por monto). Si es false, el cupón no se aplicará si hay otras promociones activas.';

-- Update existing coupons to be stackable by default
UPDATE coupons
SET stackable_with_promotions = true
WHERE stackable_with_promotions IS NULL;



