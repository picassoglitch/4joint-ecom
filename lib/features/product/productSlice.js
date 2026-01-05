import { createSlice } from '@reduxjs/toolkit'

const productSlice = createSlice({
    name: 'product',
    initialState: {
        list: [], // Empty by default, will be loaded from Supabase
        loading: true, // Track loading state
    },
    reducers: {
        setProduct: (state, action) => {
            state.list = action.payload
            state.loading = false // Products loaded
        },
        clearProduct: (state) => {
            state.list = []
        },
        setLoading: (state, action) => {
            state.loading = action.payload
        }
    }
})

export const { setProduct, clearProduct, setLoading } = productSlice.actions

export default productSlice.reducer