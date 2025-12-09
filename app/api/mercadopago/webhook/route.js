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
        // Update order status based on payment
        if (paymentStatus === 'approved') {
          await supabase
            .from('orders')
            .update({ 
              is_paid: true,
              status: 'PROCESSING',
              payment_id: paymentId.toString(),
              payment_provider: 'MERCADOPAGO',
            })
            .eq('id', externalReference);
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

