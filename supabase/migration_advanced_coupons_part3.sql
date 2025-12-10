-- Migration Part 3: Row Level Security

-- Enable Row Level Security
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public coupons are viewable by everyone" ON coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;

-- Create RLS policies
CREATE POLICY "Public coupons are viewable by everyone"
  ON coupons FOR SELECT
  USING (is_public = true OR expires_at > NOW());

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

