import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Validate access token is configured
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('⚠️ MERCADOPAGO_ACCESS_TOKEN no está configurado en las variables de entorno');
      console.error('⚠️ Verifica que el archivo .env.local exista y contenga MERCADOPAGO_ACCESS_TOKEN');
      console.error('⚠️ Asegúrate de reiniciar el servidor después de agregar la variable');
      
      return NextResponse.json(
        { 
          error: 'Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN en .env.local',
          hint: 'Revisa MERCADOPAGO_TROUBLESHOOTING.md para más información. Asegúrate de reiniciar el servidor después de agregar la variable.'
        },
        { status: 500 }
      );
    }
    
    // Log token presence (but not the actual token for security)
    console.log('✅ MERCADOPAGO_ACCESS_TOKEN está configurado (longitud:', accessToken.length, 'caracteres)');

    // Initialize client inside the function to avoid build-time errors
    const client = new MercadoPagoConfig({
      accessToken: accessToken,
      options: {
        timeout: 10000, // Increased timeout to 10 seconds
        idempotencyKey: `order-${Date.now()}` // Use timestamp for unique idempotency
      }
    });
    
    console.log('✅ MercadoPago client inicializado');

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
    // Ensure prices are positive and properly formatted
    const preferenceItems = items.map(item => ({
      title: item.name,
      quantity: item.quantity || 1,
      unit_price: Math.max(0, parseFloat(item.price) || 0), // Ensure price is positive
      currency_id: 'MXN',
    }));
    
    // Log for debugging
    console.log('MercadoPago preference items:', preferenceItems);
    const totalFromItems = preferenceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    console.log('Total from items:', totalFromItems);

    // Create preference
    const preference = new Preference(client);
    
    // Build base URL - ensure it's always defined
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim();
    
    // Ensure baseUrl is a valid URL
    if (!baseUrl || baseUrl === 'undefined' || baseUrl === 'null') {
      throw new Error('NEXT_PUBLIC_SITE_URL no está configurado correctamente. Verifica .env.local');
    }
    
    const successUrl = `${baseUrl}/order-success`.trim();
    const failureUrl = `${baseUrl}/order-success?status=failure`.trim();
    const pendingUrl = `${baseUrl}/order-success?status=pending`.trim();
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook`.trim();
    
    // Validate URLs are not empty and are valid strings
    if (!successUrl || successUrl === 'undefined' || successUrl.includes('undefined')) {
      throw new Error(`Error al construir la URL de éxito: ${successUrl}. Verifica NEXT_PUBLIC_SITE_URL en .env.local`);
    }
    if (!failureUrl || failureUrl === 'undefined' || failureUrl.includes('undefined')) {
      throw new Error(`Error al construir la URL de fallo: ${failureUrl}. Verifica NEXT_PUBLIC_SITE_URL en .env.local`);
    }
    if (!pendingUrl || pendingUrl === 'undefined' || pendingUrl.includes('undefined')) {
      throw new Error(`Error al construir la URL de pendiente: ${pendingUrl}. Verifica NEXT_PUBLIC_SITE_URL en .env.local`);
    }
    
    console.log('🔗 URLs configuradas:', {
      baseUrl: baseUrl,
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
      webhook: webhookUrl,
      successUrlType: typeof successUrl,
      successUrlLength: successUrl.length
    });
    
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
        success: successUrl, // Must be a valid URL string
        failure: failureUrl,
        pending: pendingUrl,
      },
      // auto_return: Automatically redirect to success URL after payment approval
      // Only set if success URL is valid and not localhost
      auto_return: successUrl && !successUrl.includes('localhost') ? 'approved' : undefined,
      // Payment methods configuration - allow all payment methods (cards, cash, etc.)
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12, // Maximum installments allowed
      },
      external_reference: orderId,
      notification_url: webhookUrl,
      statement_descriptor: '4joint',
      metadata: {
        order_id: orderId,
      },
    };

    console.log('📤 Creando preferencia de pago en Mercado Pago...');
    console.log('📦 Items:', preferenceItems.length, 'items');
    console.log('💰 Total:', totalFromItems);
    
    // Validate back_urls before sending
    if (!preferenceData.back_urls || !preferenceData.back_urls.success) {
      throw new Error('back_urls.success is required for Mercado Pago. Check NEXT_PUBLIC_SITE_URL configuration.');
    }
    
    // Log the actual preference data being sent (sanitize sensitive data)
    const logData = {
      ...preferenceData,
      items: preferenceItems.map(item => ({ title: item.title, quantity: item.quantity, unit_price: item.unit_price })),
      payer: preferenceData.payer ? { name: preferenceData.payer.name, email: preferenceData.payer.email } : undefined,
    };
    console.log('📋 Preference data being sent:', JSON.stringify(logData, null, 2));
    console.log('🔗 back_urls:', preferenceData.back_urls);
    console.log('📋 Preference data structure:', JSON.stringify({
      hasItems: !!preferenceData.items,
      itemsCount: preferenceData.items?.length,
      hasBackUrls: !!preferenceData.back_urls,
      backUrlsSuccess: preferenceData.back_urls?.success,
      backUrlsFailure: preferenceData.back_urls?.failure,
      backUrlsPending: preferenceData.back_urls?.pending,
      backUrlsType: typeof preferenceData.back_urls,
      backUrlsSuccessType: typeof preferenceData.back_urls?.success,
      autoReturn: preferenceData.auto_return,
      hasExternalReference: !!preferenceData.external_reference,
      hasNotificationUrl: !!preferenceData.notification_url,
    }, null, 2));
    
    const response = await preference.create({ body: preferenceData });
    
    console.log('✅ Preferencia creada exitosamente:', {
      id: response.id,
      hasInitPoint: !!response.init_point,
      hasSandboxInitPoint: !!response.sandbox_init_point
    });

    return NextResponse.json({
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
    });
  } catch (error) {
    console.error('Error creating Mercado Pago preference:', error);
    
    // Extract detailed error information safely
    let errorMessage = 'Error al crear la preferencia de pago';
    let errorCode = null;
    let errorStatus = 500;
    let errorBlockedBy = null;
    
    // Safely extract error properties
    if (error) {
      errorMessage = error.message || errorMessage;
      errorCode = error.code || error.code;
      errorStatus = error.status || error.statusCode || errorStatus;
      errorBlockedBy = error.blocked_by || error.blockedBy;
      
      // Try to extract from response if it's an API error
      if (error.response) {
        errorMessage = error.response.message || errorMessage;
        errorCode = error.response.code || errorCode;
        errorStatus = error.response.status || errorStatus;
      }
      
      // Try to extract from cause if it exists
      if (error.cause) {
        errorMessage = error.cause.message || errorMessage;
        errorCode = error.cause.code || errorCode;
        errorStatus = error.cause.status || errorStatus;
      }
    }
    
    // Provide helpful error messages based on error type
    if (errorCode === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' || errorBlockedBy === 'PolicyAgent') {
      errorMessage = 'Error de autorización en Mercado Pago. Verifica tus credenciales y configuración en el panel de Mercado Pago.';
    } else if (errorMessage?.includes('unauthorized') || errorStatus === 401) {
      errorMessage = 'Credenciales de Mercado Pago inválidas. Verifica tu ACCESS_TOKEN en .env.local';
    } else if (errorMessage?.includes('forbidden') || errorStatus === 403) {
      errorMessage = 'Acceso denegado por Mercado Pago. Verifica los permisos de tu cuenta.';
    } else if (errorMessage?.includes('timeout') || errorMessage?.includes('ETIMEDOUT')) {
      errorMessage = 'Timeout al conectar con Mercado Pago. Intenta de nuevo.';
    } else if (errorMessage?.includes('network') || errorMessage?.includes('fetch')) {
      errorMessage = 'Error de conexión con Mercado Pago. Verifica tu conexión a internet.';
    }
    
    // Create safe error details object (avoid circular references)
    const errorDetails = {
      message: errorMessage,
      code: errorCode,
      status: errorStatus,
      blocked_by: errorBlockedBy,
      type: error?.name || error?.constructor?.name || 'Unknown',
    };
    
    console.error('Mercado Pago error details:', errorDetails);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        hint: 'Revisa MERCADOPAGO_TROUBLESHOOTING.md para más información'
      },
      { status: errorStatus }
    );
  }
}

