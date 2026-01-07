import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { code, user_id, vendor_id, subtotal } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (couponError || !coupon) {
      return NextResponse.json(
        { error: 'Cupón no encontrado' },
        { status: 404 }
      )
    }

    // Check if coupon is expired
    const now = new Date()
    const expiresAt = new Date(coupon.expires_at)
    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Este cupón ha expirado' },
        { status: 400 }
      )
    }

    // Check usage limits
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json(
        { error: 'Este cupón ha alcanzado su límite de usos' },
        { status: 400 }
      )
    }

    // Check minimum purchase
    if (coupon.min_purchase && subtotal < coupon.min_purchase) {
      return NextResponse.json(
        { error: `Este cupón requiere una compra mínima de $${coupon.min_purchase}` },
        { status: 400 }
      )
    }

    // Check vendor restrictions
    if (coupon.applicable_vendor_ids) {
      let vendorIds = []
      try {
        vendorIds = typeof coupon.applicable_vendor_ids === 'string' 
          ? JSON.parse(coupon.applicable_vendor_ids)
          : coupon.applicable_vendor_ids
      } catch (e) {
        console.error('Error parsing vendor IDs:', e)
      }

      if (vendorIds.length > 0 && vendor_id && !vendorIds.includes(vendor_id)) {
        return NextResponse.json(
          { error: 'Este cupón no es válido para esta tienda' },
          { status: 400 }
        )
      }
    }

    // Check user restrictions
    if (user_id) {
      // Check if for new user only
      if (coupon.for_new_user) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user_id)
          .limit(1)

        if (orders && orders.length > 0) {
          return NextResponse.json(
            { error: 'Este cupón solo es válido para nuevos usuarios' },
            { status: 400 }
          )
        }
      }

      // Check if for member only (you can implement member check based on your logic)
      if (coupon.for_member) {
        // For now, we'll allow it. You can add member check logic here
        // const { data: user } = await supabase.auth.getUser()
        // if (user?.user_metadata?.is_member !== true) {
        //   return NextResponse.json({ error: 'Este cupón solo es válido para miembros' }, { status: 400 })
        // }
      }
    } else {
      // Guest user - check restrictions
      if (coupon.for_new_user || coupon.for_member) {
        return NextResponse.json(
          { error: 'Este cupón requiere estar registrado' },
          { status: 400 }
        )
      }
    }

    // Calculate discount based on type
    let discountAmount = 0
    let discountDescription = ''

    switch (coupon.type) {
      case 'percentage':
        discountAmount = (subtotal * coupon.discount_value) / 100
        if (coupon.max_discount && discountAmount > coupon.max_discount) {
          discountAmount = coupon.max_discount
        }
        discountDescription = `${coupon.discount_value}% de descuento`
        break

      case 'fixed_amount':
        discountAmount = Math.min(coupon.discount_value, subtotal)
        discountDescription = `$${coupon.discount_value} de descuento`
        break

      case 'free_shipping':
        discountAmount = 0 // Will be handled separately in the frontend
        discountDescription = 'Envío gratis'
        break

      case 'free_product':
        // This will be handled in the frontend by adding the product
        discountAmount = 0
        discountDescription = `Producto gratis: ${coupon.free_product_id ? 'Producto seleccionado' : 'N/A'}`
        break

      case 'gift':
        discountAmount = 0 // Gift items will be handled separately
        discountDescription = 'Regalo incluido'
        break

      default:
        discountAmount = 0
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        discount_value: coupon.discount_value,
        discount_amount: discountAmount,
        discount_description: discountDescription,
        free_product_id: coupon.free_product_id,
        min_purchase: coupon.min_purchase,
        max_discount: coupon.max_discount,
        stackable_with_promotions: coupon.stackable_with_promotions !== undefined ? coupon.stackable_with_promotions : true,
      }
    })
  } catch (error) {
    console.error('Validate coupon error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al validar el cupón' },
      { status: 500 }
    )
  }
}

