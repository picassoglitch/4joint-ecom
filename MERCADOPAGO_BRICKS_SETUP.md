# Mercado Pago Payment Bricks - Production Setup

## Architecture Overview

This integration follows a secure, production-ready architecture:

1. **Backend** (Server-side only):
   - Creates Mercado Pago preferences using Access Token
   - Access Token is NEVER exposed to client
   - Endpoint: `/api/mercadopago/preference`

2. **Frontend**:
   - Uses ONLY Public Key (safe to expose)
   - Fetches `preferenceId` from backend
   - Renders Payment Brick with `preferenceId`
   - SDK initialized once globally

## Environment Variables

### Required Variables

Add these to your `.env.local` (development) and Vercel (production):

```bash
# Mercado Pago Credentials
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3727099472713705-010815-bdff7b8923a3d8d25726e412128fb4f6-1243156223
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-3cb1e601-a891-4742-9295-176d43914d1f

# Site URL (for callbacks)
NEXT_PUBLIC_SITE_URL=https://4joint.net
```

### Variable Descriptions

- **`MERCADOPAGO_ACCESS_TOKEN`**: Server-side only. Used to create preferences. NEVER exposed to client.
- **`NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`**: Client-side safe. Used to initialize Mercado Pago SDK.
- **`NEXT_PUBLIC_SITE_URL`**: Your production domain. Used for payment callbacks.

## File Structure

```
app/
  api/
    mercadopago/
      preference/
        route.js          # Creates preference server-side
      process-payment/
        route.js          # Processes payment from Brick (if needed)
      webhook/
        route.js          # Handles payment notifications

components/
  CheckoutMPBrick.jsx     # Main Payment Brick component
  OrderSummary.jsx        # Uses CheckoutMPBrick

lib/
  mercadopago/
    init.js               # Global SDK initialization
```

## How It Works

### 1. User Clicks "Realizar Pedido" with Mercado Pago Selected

- Order is created in database
- `currentOrderId` is set
- `showPaymentBrick` is set to `true`

### 2. CheckoutMPBrick Component Mounts

- Initializes Mercado Pago SDK globally (once)
- Fetches `preferenceId` from `/api/mercadopago/preference`
- Shows loading state while fetching

### 3. Backend Creates Preference

- Receives cart items, total, order info
- Creates preference in Mercado Pago using Access Token
- Returns `preferenceId`

### 4. Payment Brick Renders

- Only renders `<Payment />` when `preferenceId` is available
- Uses `initialization={{ preferenceId }}`
- Handles payment flow internally

### 5. Payment Completion

- Mercado Pago processes payment
- Webhook updates order status
- User redirected to success/failure/pending pages

## Component Usage

### CheckoutMPBrick Props

```jsx
<CheckoutMPBrick
  items={[
    { name: 'Product 1', quantity: 2, price: 100 },
    { name: 'Product 2', quantity: 1, price: 50 },
  ]}
  total={250}                    // Total amount (number, MXN)
  orderId="order-123"            // Optional: Your order ID
  buyerEmail="user@example.com"  // Optional
  buyerName="John Doe"           // Optional
  buyerPhone="+521234567890"     // Optional
  shippingAddress={{           // Optional
    street: "Main St",
    city: "Mexico City",
    state: "CDMX",
    zip: "12345",
  }}
  onPaymentSuccess={(data) => {
    // Handle successful payment
  }}
  onPaymentError={(error) => {
    // Handle payment error
  }}
/>
```

## Security Checklist

- ✅ Access Token only used server-side
- ✅ Public Key is safe to expose (it's public)
- ✅ No sensitive data in client bundles
- ✅ Preferences created server-side
- ✅ Webhook validates payments
- ✅ Idempotency keys used for payments

## Testing

### Development

1. Set environment variables in `.env.local`
2. Start dev server: `npm run dev`
3. Add items to cart
4. Select "Mercado Pago" payment method
5. Click "Realizar Pedido"
6. Payment Brick should load and show payment form

### Production

1. Set environment variables in Vercel
2. Deploy to production
3. Test with real card (use test cards from Mercado Pago dashboard)
4. Verify webhook receives notifications
5. Check order status updates correctly

## Troubleshooting

### Payment Brick Not Loading

- Check browser console for errors
- Verify `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` is set
- Check network tab for `/api/mercadopago/preference` response
- Ensure `preferenceId` is returned from backend

### Preference Creation Fails

- Verify `MERCADOPAGO_ACCESS_TOKEN` is set
- Check server logs for Mercado Pago API errors
- Ensure Access Token is valid and not expired
- Verify items have valid prices (numbers > 0)

### SDK Initialization Errors

- Check `lib/mercadopago/init.js` logs
- Verify Public Key format is correct
- Ensure SDK is initialized only once (check console logs)

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` is production domain (https://)
- [ ] Webhook URL configured in Mercado Pago dashboard
- [ ] Test payment with real card
- [ ] Verify webhook receives notifications
- [ ] Check order status updates correctly
- [ ] Test error handling (invalid card, etc.)
- [ ] Verify no Access Token in client bundles

## Support

For issues:
1. Check browser console for errors
2. Check server logs (Vercel logs)
3. Verify environment variables
4. Test with Mercado Pago test cards
5. Check Mercado Pago dashboard for payment status

