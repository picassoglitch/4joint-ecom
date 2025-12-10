import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET all coupons
export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get all coupons (only non-expired for public, all for admin)
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Get coupons error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST create new coupon
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      code,
      description,
      type,
      discount_value,
      min_purchase,
      max_discount,
      free_product_id,
      for_new_user,
      for_member,
      is_public,
      applicable_vendor_ids,
      max_uses,
      expires_at
    } = body

    // Validate required fields
    if (!code || !description || !type || !discount_value || !expires_at) {
      return NextResponse.json(
        { error: 'Missing required fields: code, description, type, discount_value, expires_at' },
        { status: 400 }
      )
    }

    // Validate coupon type
    const validTypes = ['percentage', 'fixed_amount', 'free_shipping', 'free_product', 'gift']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid coupon type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Create client with the provided token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const userRole = user.user_metadata?.role
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      )
    }

    // Use service role key to create coupon
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if coupon code already exists
    const { data: existingCoupon } = await adminClient
      .from('coupons')
      .select('code')
      .eq('code', code.toUpperCase())
      .single()

    if (existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 400 }
      )
    }

    // Prepare coupon data
    const couponData = {
      code: code.toUpperCase(),
      description,
      type,
      discount_value: parseFloat(discount_value),
      min_purchase: min_purchase ? parseFloat(min_purchase) : 0,
      max_discount: max_discount ? parseFloat(max_discount) : null,
      free_product_id: free_product_id || null,
      for_new_user: for_new_user || false,
      for_member: for_member || false,
      is_public: is_public || false,
      applicable_vendor_ids: applicable_vendor_ids && applicable_vendor_ids.length > 0 
        ? JSON.stringify(applicable_vendor_ids) 
        : null,
      max_uses: max_uses ? parseInt(max_uses) : null,
      used_count: 0,
      expires_at: expires_at,
    }

    // Create coupon
    const { data, error } = await adminClient
      .from('coupons')
      .insert(couponData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Create coupon error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

