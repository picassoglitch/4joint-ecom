import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Telegram Bot configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Can be vendor-specific or general

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, vendorId } = body;

    if (!orderId || !vendorId) {
      return NextResponse.json(
        { error: 'orderId and vendorId are required' },
        { status: 400 }
      );
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

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
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

    // Send Telegram notification
    try {
      await sendTelegramNotification(orderMessage, vendor.telegram_chat_id || TELEGRAM_CHAT_ID);
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

async function sendTelegramNotification(message, chatId) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.warn('Telegram bot token or chat ID not configured, skipping Telegram notification');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${errorData.description || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

