import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        total: 0,
        cartItems: {}, // Format: { [productId]: { quantity: number, variant: { name, price } | null } }
    },
    reducers: {
        addToCart: (state, action) => {
            const { productId, variant } = action.payload
            const cartKey = variant ? `${productId}_${variant.name}` : productId
            
            if (state.cartItems[cartKey]) {
                state.cartItems[cartKey].quantity++
            } else {
                state.cartItems[cartKey] = {
                    quantity: 1,
                    variant: variant || null,
                }
            }
            state.total += 1
        },
        removeFromCart: (state, action) => {
            const { productId, variant } = action.payload
            const cartKey = variant ? `${productId}_${variant.name}` : productId
            
            if (state.cartItems[cartKey]) {
                state.cartItems[cartKey].quantity--
                if (state.cartItems[cartKey].quantity === 0) {
                    delete state.cartItems[cartKey]
                }
            }
            state.total -= 1
        },
        deleteItemFromCart: (state, action) => {
            const { productId, variant } = action.payload
            const cartKey = variant ? `${productId}_${variant.name}` : productId
            
            const item = state.cartItems[cartKey]
            if (item) {
                state.total -= item.quantity
                delete state.cartItems[cartKey]
            }
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
        },
    }
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions

export default cartSlice.reducer
