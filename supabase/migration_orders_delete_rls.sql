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

-- Policy: Admins can delete any order
-- Note: This checks if the user's role in metadata is 'admin'
-- You may need to adjust this based on how admin role is stored
CREATE POLICY "Admins can delete any order"
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
COMMENT ON POLICY "Vendors can delete their own orders" ON public.orders IS 
  'Allows vendors to delete orders where they are the vendor (vendor_id = auth.uid())';

COMMENT ON POLICY "Admins can delete any order" ON public.orders IS 
  'Allows users with admin role to delete any order';

