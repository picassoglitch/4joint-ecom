import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification, formatOrderNotification } from '@/lib/services/telegram';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, vendorId } = body;

    console.log(`📬 Notification request received - Order: ${orderId}, Vendor: ${vendorId}`)

    if (!orderId || !vendorId) {
      console.error('❌ Missing required parameters:', { orderId, vendorId })
      return NextResponse.json(
        { error: 'orderId and vendorId are required' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items:order_items (
          *,
          product:products (
            name,
            price
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json(
        { error: 'Error fetching order', details: orderError },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch address separately (Supabase may not have FK relationship cached for joins)
    if (order.address_id) {
      const { data: address, error: addressError } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', order.address_id)
        .single()

      if (addressError) {
        // Non-blocking: we can still send the order notification without address details
        console.warn('Warning fetching address for order (non-blocking):', addressError)
      } else if (address) {
        order.address = address
      }
    }

    // Get vendor details
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendor) {
      console.error('Error fetching vendor:', vendorError);
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Get vendor user email
    const { data: vendorUser, error: userError } = await supabase.auth.admin.getUserById(vendorId);
    const vendorEmail = vendorUser?.user?.email || vendor.email;

    // Prepare notification content
    const orderItemsText = order.order_items?.map(item => {
      const productName = item.product?.name || 'Producto';
      const variant = item.variant ? ` (${item.variant.name})` : '';
      return `- ${productName}${variant}: ${item.quantity}x $${parseFloat(item.price).toFixed(2)}`;
    }).join('\n') || 'No items';

    const orderMessage = `
🛒 NUEVA ORDEN RECIBIDA

📦 Orden #${orderId.slice(0, 8).toUpperCase()}
💰 Total: $${parseFloat(order.total).toFixed(2)} MXN
📊 Estado: ${order.status}
💳 Método de pago: ${order.payment_method || 'COD'}
${order.payment_method === 'COD' && order.cod_payment_preference ? `💵 Pago al recibir: ${order.cod_payment_preference === 'terminal' ? 'Tarjeta (llevar terminal)' : 'Efectivo'}` : ''}

📋 Productos:
${orderItemsText}

${order.guest_name ? `👤 Cliente: ${order.guest_name}` : ''}
${order.guest_email ? `📧 Email: ${order.guest_email}` : ''}
${order.guest_phone ? `📱 Teléfono: ${order.guest_phone}` : ''}

${order.guest_address ? `📍 Dirección:
${order.guest_address.street || order.guest_address.address || ''}
${order.guest_address.city || ''}, ${order.guest_address.state || ''} ${order.guest_address.zip || ''}` : ''}

${order.delivery_option ? `🚚 Entrega: ${order.delivery_option}` : ''}
${order.tip_amount > 0 ? `💵 Propina: $${parseFloat(order.tip_amount).toFixed(2)}` : ''}

Fecha: ${new Date(order.created_at).toLocaleString('es-MX')}
    `.trim();

    // Send email notification
    try {
      await sendEmailNotification(vendorEmail, orderMessage, orderId);
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
    }

    // Send Telegram notification using the new service
    try {
      console.log(`📱 Attempting to send Telegram notification to vendor: ${vendorId}`)
      
      // Format order items for Telegram notification
      const formattedItems = (order.order_items || []).map(item => ({
        product: item.product || { name: 'Producto' },
        quantity: item.quantity || 1,
        price: parseFloat(item.price) || 0,
        variant: item.variant || null,
      }));

      const telegramMessage = formatOrderNotification(order, formattedItems);
      const telegramResult = await sendTelegramNotification(vendorId, telegramMessage, 'newOrder', order.id, order);
      
      if (telegramResult.success) {
        console.log(`✅ Telegram notification sent successfully to vendor ${vendorId}`)
      } else {
        console.error(`❌ Telegram notification failed for vendor ${vendorId}:`, telegramResult.error)
      }
    } catch (telegramError) {
      console.error('Error sending Telegram notification:', telegramError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notifications sent',
      emailSent: true,
      telegramSent: true
    });

  } catch (error) {
    console.error('Error in notify-vendor:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function sendEmailNotification(vendorEmail, message, orderId) {
  // Using Resend or similar email service
  // You can also use Supabase Edge Functions or a service like SendGrid, Mailgun, etc.
  
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email notification');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: '4joint <notificaciones@4joint.net>',
        to: vendorEmail,
        subject: `🛒 Nueva Orden #${orderId.slice(0, 8).toUpperCase()} - 4joint`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00C6A2;">Nueva Orden Recibida</h2>
            <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 20px; border-radius: 8px;">${message}</pre>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Puedes ver más detalles en tu panel de vendedor: <a href="${process.env.NEXT_PUBLIC_SITE_URL}/store/orders">Ver Pedidos</a>
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}


