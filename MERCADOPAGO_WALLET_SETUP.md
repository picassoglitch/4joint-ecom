# Mercado Pago Wallet Brick - Production Setup

## ✅ Simple & Reliable Architecture

This implementation uses **Checkout Pro + Wallet Brick** - the most reliable production path:

1. **Backend** creates preference server-side (secure)
2. **Frontend** renders Wallet Brick with `preferenceId`
3. **User** completes payment via Mercado Pago
4. **Redirect** to success/failure/pending pages

## Environment Variables

### Required Variables

Add these to your `.env.local` (development) and Vercel (production):

```bash
# Mercado Pago Credentials
MP_ACCESS_TOKEN=APP_USR-3727099472713705-010815-bdff7b8923a3d8d25726e412128fb4f6-1243156223
# OR use existing variable name (both work):
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3727099472713705-010815-bdff7b8923a3d8d25726e412128fb4f6-1243156223

NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-3cb1e601-a891-4742-9295-176d43914d1f
# OR use existing variable name (both work):
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-3cb1e601-a891-4742-9295-176d43914d1f

# Site URL (for callbacks)
NEXT_PUBLIC_SITE_URL=https://4joint.net
```

**Note:** The code supports both variable name formats (`MP_*` and `MERCADOPAGO_*`) for compatibility.

## File Structure

```
app/
  api/
    mp/
      preference/
        route.js          # Creates preference server-side

components/
  MercadoPagoCheckout.jsx # Wallet Brick component

app/
  checkout/
    success/
      page.jsx            # ✅ Already exists
    failure/
      page.jsx            # ✅ Already exists
    pending/
      page.jsx            # ✅ Already exists
```

## How It Works

### 1. User Clicks "Realizar Pedido" with Mercado Pago Selected

- Order is created in database
- `currentOrderId` is set
- `showPaymentBrick` is set to `true`

### 2. MercadoPagoCheckout Component Mounts

- Initializes Mercado Pago SDK globally (once)
- Fetches `preferenceId` from `/api/mp/preference`
- Shows loading state while fetching

### 3. Backend Creates Preference

- Receives cart items or total
- Creates preference in Mercado Pago using Access Token
- Returns `preferenceId`

### 4. Wallet Brick Renders

- Only renders `<Wallet />` when `preferenceId` is available
- Uses `initialization={{ preferenceId }}`
- User clicks "Pagar" and is redirected to Mercado Pago

### 5. Payment Completion

- Mercado Pago processes payment
- User is redirected to:
  - `/checkout/success` - Payment approved
  - `/checkout/failure` - Payment rejected
  - `/checkout/pending` - Payment pending

## Component Usage

### MercadoPagoCheckout Props

```jsx
<MercadoPagoCheckout
  total={250}                    // Total amount (number, MXN)
  items={[                       // Optional: Cart items
    { title: 'Product 1', quantity: 2, unit_price: 100 },
    { title: 'Product 2', quantity: 1, unit_price: 50 },
  ]}
  orderId="order-123"            // Optional: Your order ID
/>
```

**Note:** You can pass either `total` OR `items`. If `items` is provided, it will be used. Otherwise, it falls back to a single item with the `total` amount.

## Security Checklist

- ✅ Access Token only used server-side
- ✅ Public Key is safe to expose (it's public)
- ✅ No sensitive data in client bundles
- ✅ Preferences created server-side
- ✅ SDK initialized once globally
- ✅ Proper error handling

## Testing

### Development

1. Set environment variables in `.env.local`:
   ```bash
   MP_ACCESS_TOKEN=your_access_token
   NEXT_PUBLIC_MP_PUBLIC_KEY=your_public_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. Start dev server: `npm run dev`

3. Add items to cart

4. Select "Mercado Pago" payment method

5. Click "Realizar Pedido"

6. Wallet Brick should load and show "Pagar" button

7. Click "Pagar" - you'll be redirected to Mercado Pago

8. Complete payment (use test cards from Mercado Pago dashboard)

9. You'll be redirected back to `/checkout/success` or `/checkout/failure`

### Production

1. Set environment variables in Vercel:
   - `MP_ACCESS_TOKEN` (or `MERCADOPAGO_ACCESS_TOKEN`)
   - `NEXT_PUBLIC_MP_PUBLIC_KEY` (or `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`)
   - `NEXT_PUBLIC_SITE_URL=https://4joint.net`

2. Deploy to production

3. Test with real card (use test cards from Mercado Pago dashboard)

4. Verify redirects work correctly

## Troubleshooting

### Wallet Brick Not Loading

- Check browser console for errors
- Verify `NEXT_PUBLIC_MP_PUBLIC_KEY` is set
- Check network tab for `/api/mp/preference` response
- Ensure `preferenceId` is returned from backend

### Preference Creation Fails

- Verify `MP_ACCESS_TOKEN` is set
- Check server logs for Mercado Pago API errors
- Ensure Access Token is valid and not expired
- Verify items have valid prices (numbers > 0) or total is valid

### SDK Initialization Errors

- Check browser console for initialization logs
- Verify Public Key format is correct
- Ensure SDK is initialized only once (check console logs)

### Redirect Not Working

- Verify `NEXT_PUBLIC_SITE_URL` is set correctly
- Check that `/checkout/success`, `/checkout/failure`, `/checkout/pending` pages exist
- Ensure `back_urls` in preference match your domain

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` is production domain (https://)
- [ ] Test payment with real card
- [ ] Verify redirects work correctly
- [ ] Test error handling (invalid card, etc.)
- [ ] Verify no Access Token in client bundles
- [ ] Check that Wallet Brick loads correctly

## Advantages of This Approach

1. **Simple**: Wallet Brick handles the entire payment flow
2. **Reliable**: Uses Mercado Pago's proven Checkout Pro backend
3. **Secure**: Access Token never exposed to client
4. **Fast**: No complex payment form handling
5. **User-friendly**: Familiar Mercado Pago checkout experience

## Support

For issues:
1. Check browser console for errors
2. Check server logs (Vercel logs)
3. Verify environment variables
4. Test with Mercado Pago test cards
5. Check Mercado Pago dashboard for payment status

