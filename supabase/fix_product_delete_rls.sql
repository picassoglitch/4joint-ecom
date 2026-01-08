-- Fix: Ensure product deletion RLS policy is working correctly
-- This script verifies and fixes the DELETE policy for products

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Vendors can delete their own products" ON public.products;

-- Recreate the DELETE policy
CREATE POLICY "Vendors can delete their own products"
  ON public.products
  FOR DELETE
  USING (auth.uid() = vendor_id);

-- Add comment for documentation
COMMENT ON POLICY "Vendors can delete their own products" ON public.products IS 
  'Allows vendors to delete products where they are the vendor (vendor_id = auth.uid())';

-- Verify RLS is enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;


