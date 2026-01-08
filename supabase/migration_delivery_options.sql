-- Migration: Add delivery options and free shipping threshold to vendors table
-- This allows stores to configure their delivery options (same day, on demand) and free shipping threshold

-- Add free_shipping_threshold column
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS free_shipping_threshold DOUBLE PRECISION DEFAULT 800;

-- Add delivery_options column (JSONB array of delivery option objects)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS delivery_options JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN vendors.free_shipping_threshold IS 'Minimum order amount (MXN) for free shipping. Default: 800';
COMMENT ON COLUMN vendors.delivery_options IS 'Array of delivery options configured by the store. Each option has: id, name, price, description, enabled';

-- Example structure for delivery_options:
-- [
--   {
--     "id": "same_day",
--     "name": "Entrega Mismo Día",
--     "price": 80,
--     "description": "Lun-Vie antes de 8pm, Sáb antes de 6pm",
--     "enabled": true
--   },
--   {
--     "id": "on_demand",
--     "name": "On Demand",
--     "price": 150,
--     "description": "Entrega inmediata en 80 min. Lun-Vie antes de 8pm. Solo CDMX",
--     "enabled": true
--   }
-- ]


