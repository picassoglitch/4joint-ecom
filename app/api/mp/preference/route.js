import { NextResponse } from "next/server";

/**
 * Create Mercado Pago Preference API Route
 * 
 * Creates a preference server-side using Access Token.
 * Returns preferenceId for Wallet Brick.
 * 
 * SECURITY: Access Token is NEVER exposed to client - only used server-side.
 */
export async function POST(req) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!accessToken) {
      return NextResponse.json({ message: "MP_ACCESS_TOKEN missing" }, { status: 500 });
    }
    if (!siteUrl) {
      return NextResponse.json({ message: "NEXT_PUBLIC_SITE_URL missing" }, { status: 500 });
    }

    const body = await req.json();

    // Expect either items or total; we'll build items safely.
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const total = Number(body?.total);

    let items = rawItems
      .map((it) => ({
        title: String(it?.title || it?.name || "Producto"),
        quantity: Math.max(1, Number(it?.quantity || 1)),
        unit_price: Number(it?.unit_price ?? it?.price ?? 0),
      }))
      .filter((it) => Number.isFinite(it.unit_price) && it.unit_price > 0);

    // If items not provided or invalid, fallback to a single item using total
    if (items.length === 0) {
      if (!Number.isFinite(total) || total <= 0) {
        return NextResponse.json(
          { message: "Invalid cart: provide items[] with unit_price or a valid total" },
          { status: 400 }
        );
      }
      items = [{ title: "Compra en tienda", quantity: 1, unit_price: total }];
    }

    // Calculate total to validate minimum amount
    const calculatedTotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    
    // Validate minimum amount (Mercado Pago requires at least 1 MXN)
    if (calculatedTotal < 1) {
      return NextResponse.json(
        { message: "El monto total debe ser al menos 1 MXN" },
        { status: 400 }
      );
    }

    const preferencePayload = {
      items: items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: "MXN",
      })),
      back_urls: {
        success: `${siteUrl}/checkout/success`,
        failure: `${siteUrl}/checkout/failure`,
        pending: `${siteUrl}/checkout/pending`,
      },
      auto_return: "approved",
      // Statement descriptor must be max 13 alphanumeric characters
      statement_descriptor: "4JOINT",
      // Explicitly allow ALL payment methods (no exclusions)
      // This ensures no payment methods are excluded
      payment_methods: {
        excluded_payment_methods: [], // Empty = allow all methods
        excluded_payment_types: [],   // Empty = allow all types
        installments: 12, // Allow up to 12 installments for credit cards
      },
      ...(body?.orderId && { external_reference: String(body.orderId) }),
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Creating Mercado Pago preference:', {
        itemsCount: items.length,
        total: calculatedTotal,
        orderId: body?.orderId || 'none',
        paymentMethods: 'ALL (no exclusions)',
      });
      console.log('📤 Preference payload:', JSON.stringify(preferencePayload, null, 2));
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpJson = await mpRes.json();

    if (!mpRes.ok) {
      console.error('❌ Mercado Pago preference error:', mpJson);
      return NextResponse.json(
        { message: "Mercado Pago preference error", details: mpJson },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mercado Pago preference created:', mpJson.id);
    }

    return NextResponse.json({ preferenceId: mpJson.id });
  } catch (err) {
    console.error('❌ Error creating Mercado Pago preference:', err);
    return NextResponse.json(
      { message: "Server error creating preference", error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

