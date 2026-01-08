-- ============================================
-- COMPLETE SETUP: Store Requests Table
-- ============================================
-- Copy and paste this entire script into Supabase SQL Editor
-- Then click "Run" to execute

-- Step 1: Create the store_requests table
CREATE TABLE IF NOT EXISTS public.store_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_requests_user_id ON public.store_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_store_requests_status ON public.store_requests(status);
CREATE INDEX IF NOT EXISTS idx_store_requests_created_at ON public.store_requests(created_at DESC);

-- Step 3: Add table comments
COMMENT ON TABLE public.store_requests IS 'Stores requests from users who want to become vendors';
COMMENT ON COLUMN public.store_requests.status IS 'Status: pending, reviewed, approved, rejected';

-- Step 4: Enable Row Level Security
ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own store requests" ON public.store_requests;
DROP POLICY IF EXISTS "Admins can view all store requests" ON public.store_requests;
DROP POLICY IF EXISTS "Admins can update store requests" ON public.store_requests;
DROP POLICY IF EXISTS "Users can view their own store requests" ON public.store_requests;

-- Step 6: Create RLS Policies

-- Policy: Users can insert their own store requests
CREATE POLICY "Users can insert their own store requests"
ON public.store_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all store requests
CREATE POLICY "Admins can view all store requests"
ON public.store_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Admins can update store requests
CREATE POLICY "Admins can update store requests"
ON public.store_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Users can view their own store requests
CREATE POLICY "Users can view their own store requests"
ON public.store_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.store_requests TO authenticated;

-- ============================================
-- VERIFICATION QUERY (Optional - run to verify)
-- ============================================
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'store_requests'
-- ORDER BY ordinal_position;




