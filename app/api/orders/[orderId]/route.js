import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function DELETE(request, { params }) {
  try {
    // Next.js 15+ requires awaiting params
    const resolvedParams = await params
    const { orderId } = resolvedParams

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid token' },
        { status: 401 }
      )
    }

    const userRole = user.user_metadata?.role || 'user'

    // First verify the order exists
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('vendor_id')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      throw fetchError
    }

    // Admin can delete any order, vendors can only delete their own orders
    if (userRole !== 'admin' && existingOrder.vendor_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este pedido' },
        { status: 403 }
      )
    }

    // Delete the order (order_items will be deleted automatically due to CASCADE)
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (deleteError) {
      console.error('Error deleting order:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar el pedido', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Pedido eliminado correctamente'
    })
  } catch (error) {
    console.error('Error in DELETE /api/orders/[orderId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

