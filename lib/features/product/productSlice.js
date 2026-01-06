import { createSlice } from '@reduxjs/toolkit'

const productSlice = createSlice({
    name: 'product',
    initialState: {
        list: [], // Empty by default, will be loaded from Supabase
    },
    reducers: {
        setProduct: (state, action) => {
            state.list = action.payload
        },
        clearProduct: (state) => {
            state.list = []
        }
    }
})

export const { setProduct, clearProduct } = productSlice.actions

export default productSlice.reducer