import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    console.log('Mercado Pago webhook received:', { type, data });

    // Handle payment notifications
    if (type === 'payment') {
      const paymentId = data.id;
      const paymentStatus = data.status;
      const externalReference = data.external_reference; // This should be the order_id

      if (supabase && externalReference) {
        // Get vendor info to check if order approval is required
        const { data: orderData } = await supabase
          .from('orders')
          .select('vendor_id')
          .eq('id', externalReference)
          .single()

        let requireApproval = false
        if (orderData?.vendor_id) {
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('require_order_approval')
            .eq('id', orderData.vendor_id)
            .single()
          
          requireApproval = vendorData?.require_order_approval || false
        }

        // Update order status based on payment
        if (paymentStatus === 'approved') {
          // If vendor requires approval, keep status as ORDER_PLACED
          // Otherwise, move to PROCESSING
          const newStatus = requireApproval ? 'ORDER_PLACED' : 'PROCESSING'
          
          await supabase
            .from('orders')
            .update({ 
              is_paid: true,
              status: newStatus,
              payment_id: paymentId.toString(),
              payment_provider: 'MERCADOPAGO',
            })
            .eq('id', externalReference);
          
          // Notify vendor about the confirmed payment and order
          console.log(`📧 Payment approved for order ${externalReference}. Notifying vendor ${orderData?.vendor_id}...`)
          try {
            const notifyResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notify-vendor`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: externalReference,
                vendorId: orderData.vendor_id,
              }),
            })
            
            if (!notifyResponse.ok) {
              const errorData = await notifyResponse.json().catch(() => ({}))
              console.error('❌ Notification API error:', errorData)
            } else {
              const result = await notifyResponse.json()
              console.log('✅ Notification sent after payment confirmation:', result)
            }
          } catch (notifyError) {
            console.error('❌ Error notifying vendor after payment (non-blocking):', notifyError);
            // Don't fail the webhook if notification fails
          }
        } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
          await supabase
            .from('orders')
            .update({ 
              is_paid: false,
              status: 'ORDER_PLACED',
              payment_id: paymentId.toString(),
              payment_provider: 'MERCADOPAGO',
            })
            .eq('id', externalReference);
        } else if (paymentStatus === 'pending') {
          await supabase
            .from('orders')
            .update({ 
              is_paid: false,
              status: 'ORDER_PLACED',
              payment_id: paymentId.toString(),
              payment_provider: 'MERCADOPAGO',
            })
            .eq('id', externalReference);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}

