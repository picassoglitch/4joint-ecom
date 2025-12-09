import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Validate access token is configured
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error('⚠️ MERCADOPAGO_ACCESS_TOKEN no está configurado en las variables de entorno');
      return NextResponse.json(
        { 
          error: 'Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN en .env.local',
          hint: 'Revisa MERCADOPAGO_TROUBLESHOOTING.md para más información'
        },
        { status: 500 }
      );
    }

    // Initialize client inside the function to avoid build-time errors
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
        idempotencyKey: 'abc'
      }
    });

    const body = await request.json();
    const { items, orderId, payer } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      );
    }

    // Create preference items
    const preferenceItems = items.map(item => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: parseFloat(item.price),
      currency_id: 'MXN',
    }));

    // Create preference
    const preference = new Preference(client);
    
    const preferenceData = {
      items: preferenceItems,
      payer: payer ? {
        name: payer.name,
        surname: payer.surname || '',
        email: payer.email,
        phone: payer.phone ? {
          area_code: '52',
          number: payer.phone.replace(/\D/g, ''),
        } : undefined,
        address: payer.address ? {
          street_name: payer.address.street,
          street_number: payer.address.streetNumber || '',
          zip_code: payer.address.zip,
        } : undefined,
      } : undefined,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/failure`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/pending`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      notification_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/mercadopago/webhook`,
      statement_descriptor: '4joint',
      metadata: {
        order_id: orderId,
      },
    };

    const response = await preference.create({ body: preferenceData });

    return NextResponse.json({
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
    });
  } catch (error) {
    console.error('Error creating Mercado Pago preference:', error);
    
    // Extract detailed error information
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.status,
      blocked_by: error.blocked_by,
      fullError: error
    };
    
    console.error('Mercado Pago error details:', errorDetails);
    
    // Provide helpful error messages based on error type
    let errorMessage = 'Error al crear la preferencia de pago';
    
    if (error.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' || error.blocked_by === 'PolicyAgent') {
      errorMessage = 'Error de autorización en Mercado Pago. Verifica tus credenciales y configuración en el panel de Mercado Pago.';
    } else if (error.message?.includes('unauthorized') || error.status === 401) {
      errorMessage = 'Credenciales de Mercado Pago inválidas. Verifica tu ACCESS_TOKEN.';
    } else if (error.message?.includes('forbidden') || error.status === 403) {
      errorMessage = 'Acceso denegado por Mercado Pago. Verifica los permisos de tu cuenta.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        hint: 'Revisa MERCADOPAGO_TROUBLESHOOTING.md para más información'
      },
      { status: error.status || 500 }
    );
  }
}

