-- Migration: Add DELETE policies for orders table
-- Allows:
-- 1. Admins to delete any order
-- 2. Vendors to delete their own orders (where vendor_id = auth.uid())

-- Drop existing DELETE policy if it exists (idempotent)
DROP POLICY IF EXISTS "Vendors can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete any order" ON public.orders;

-- Policy: Vendors can delete their own orders
CREATE POLICY "Vendors can delete their own orders"
  ON public.orders
  FOR DELETE
  USING (auth.uid() = vendor_id);

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

