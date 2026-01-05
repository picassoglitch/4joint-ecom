'use client'
import React, { useEffect } from 'react'
import FeedBlock from './FeedBlock'
import { useSelector } from 'react-redux'
import { Package } from 'lucide-react'

const LatestProducts = () => {
    const displayQuantity = 8
    const products = useSelector(state => state.product.list)
    const isLoading = useSelector(state => state.product.loading)

    // Debug logging
    useEffect(() => {
        console.log(`🏠 Home page: ${products.length} products available for display`)
    }, [products])

    const latestProducts = products.length > 0
        ? products.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, displayQuantity)
        : []

    return (
        <FeedBlock
            title="Productos Recientes"
            subtitle="Lo último agregado"
            products={latestProducts}
            showLabel={true}
            labelType={{ text: 'Nuevo', icon: Package, color: 'bg-blue-500' }}
            isLoading={isLoading}
        />
    )
}

export default LatestProducts