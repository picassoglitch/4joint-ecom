-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create Storage Bucket for product images
-- Note: Run this in Supabase Dashboard > Storage, or use the SQL below
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage Policy: Allow authenticated users to upload images
-- CREATE POLICY "Users can upload product images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'product-images');

-- Storage Policy: Allow public read access
-- CREATE POLICY "Product images are publicly accessible"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'product-images');

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  mrp DECIMAL(10, 2),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(100),
  images TEXT[],
  in_stock BOOLEAN DEFAULT true,
  variants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  username VARCHAR(100) UNIQUE,
  description TEXT,
  logo TEXT,
  address TEXT,
  contact VARCHAR(50),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table (supports guest checkout)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'ORDER_PLACED',
  payment_method VARCHAR(50),
  is_paid BOOLEAN DEFAULT false,
  address_id UUID,
  commission DECIMAL(10, 2) DEFAULT 0,
  vendor_earnings DECIMAL(10, 2) DEFAULT 0,
  -- Guest checkout fields
  guest_email VARCHAR(255),
  guest_name VARCHAR(255),
  guest_phone VARCHAR(50),
  guest_address JSONB,
  -- Delivery and tip fields
  delivery_option VARCHAR(50),
  delivery_cost DECIMAL(10, 2) DEFAULT 0,
  tip_amount DECIMAL(10, 2) DEFAULT 0,
  -- Payment provider fields
  payment_id VARCHAR(255),
  payment_provider VARCHAR(50) DEFAULT 'COD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  variant JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Row Level Security Policies

-- Products: Users can read all, vendors can manage their own
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Vendors can insert their own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update their own products"
  ON products FOR UPDATE
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete their own products"
  ON products FOR DELETE
  USING (auth.uid() = vendor_id);

-- Vendors: Public read, vendors can update their own
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors are viewable by everyone"
  ON vendors FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own vendor profile"
  ON vendors FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Vendors can update their own profile"
  ON vendors FOR UPDATE
  USING (auth.uid() = id);

-- Orders: Users can see their own orders, vendors can see orders for their products, guests can create orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = vendor_id 
    OR user_id IS NULL -- Guest orders
  );

CREATE POLICY "Users and guests can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL -- Allow guest checkout
  );

CREATE POLICY "Vendors can update orders for their products"
  ON orders FOR UPDATE
  USING (auth.uid() = vendor_id);

-- Order items: Same as orders
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items are viewable by order owner or vendor"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR orders.vendor_id = auth.uid())
    )
  );

CREATE POLICY "Order items can be inserted with order"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR orders.user_id IS NULL) -- Allow guest orders
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Helper function to update user role (for use in Supabase Dashboard)
-- Usage: SELECT update_user_role('user_id_here'::uuid, 'admin'::text);
CREATE OR REPLACE FUNCTION update_user_role(user_id UUID, new_role TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Validate role
  IF new_role NOT IN ('user', 'vendor', 'admin') THEN
    RETURN 'Error: Invalid role. Must be: user, vendor, or admin';
  END IF;

  -- Update user metadata in auth.users
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  )
  WHERE id = user_id;

  IF FOUND THEN
    result := 'Role updated successfully to: ' || new_role;
  ELSE
    result := 'Error: User not found';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View to see all users with their roles (read-only)
CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  u.raw_user_meta_data->>'role' as role,
  u.created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  CASE 
    WHEN u.raw_user_meta_data->>'role' = 'admin' THEN 'Administrador'
    WHEN u.raw_user_meta_data->>'role' = 'vendor' THEN 'Vendedor'
    ELSE 'Usuario'
  END as role_label
FROM auth.users u
ORDER BY u.created_at DESC;

-- Grant access to view (optional, for admin users)
-- GRANT SELECT ON user_roles_view TO authenticated;

