import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params
    const { orderId } = resolvedParams

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('Error fetching order:', error)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error in GET order API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // For admins, use service role key to bypass RLS
    // For vendors, use the user's token (but vendors can no longer delete orders)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let deleteClient = supabase

    if (userRole === 'admin' && serviceRoleKey) {
      console.log('🔑 Using service role key for admin deletion')
      deleteClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }

    // First verify the order exists
    const { data: existingOrder, error: fetchError } = await deleteClient
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

    // Only admins can delete orders now (vendors can no longer delete)
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden eliminar pedidos' },
        { status: 403 }
      )
    }

    // Delete the order (order_items will be deleted automatically due to CASCADE)
    console.log('🗑️ Deleting order from database:', orderId)
    const { data: deletedData, error: deleteError } = await deleteClient
      .from('orders')
      .delete()
      .eq('id', orderId)
      .select() // Select to verify deletion

    if (deleteError) {
      console.error('❌ Error deleting order:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar el pedido', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('✅ Order deleted from database:', { orderId, deletedData })

    // Verify deletion by checking if order still exists (use service role for admin)
    const verifyClient = userRole === 'admin' && serviceRoleKey 
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : supabase
    
    const { data: verifyOrder } = await verifyClient
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single()

    if (verifyOrder) {
      console.warn('⚠️ Order still exists after deletion attempt:', orderId)
      return NextResponse.json(
        { error: 'El pedido no se pudo eliminar. Verifica los permisos o contacta al administrador.' },
        { status: 500 }
      )
    }

    console.log('✅ Order deletion verified - order no longer exists in database')

    return NextResponse.json({ 
      success: true,
      message: 'Pedido eliminado correctamente',
      deletedId: orderId
    })
  } catch (error) {
    console.error('Error in DELETE /api/orders/[orderId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

