-- Migration: Add DELETE policies for orders table
-- Allows:
-- 1. Only admins can delete orders (vendors can no longer delete orders)

-- Drop existing DELETE policy if it exists (idempotent)
DROP POLICY IF EXISTS "Vendors can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete any order" ON public.orders;
DROP POLICY IF EXISTS "Only admins can delete orders" ON public.orders;

-- Policy: Only admins can delete orders
-- Vendors can no longer delete their own orders - only admins can delete orders
CREATE POLICY "Only admins can delete orders"
  ON public.orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Only admins can delete orders" ON public.orders IS 
  'Only users with admin role can delete orders. Vendors can no longer delete orders.';

