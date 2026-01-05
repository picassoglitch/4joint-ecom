'use client'
import FeedBlock from './FeedBlock'
import { useSelector } from 'react-redux'
import { TrendingUp } from 'lucide-react'

const BestSelling = () => {
    const displayQuantity = 8
    const products = useSelector(state => state.product.list)
    const isLoading = useSelector(state => state.product.loading)

    const bestSelling = products.length > 0
        ? products.slice().sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0)).slice(0, displayQuantity)
        : []

    return (
        <FeedBlock
            title="Más Vendidos"
            subtitle="Los favoritos de la comunidad"
            products={bestSelling}
            showLabel={true}
            labelType={{ text: 'Popular', icon: TrendingUp, color: 'bg-[#00C6A2]' }}
            isLoading={isLoading}
        />
    )
}

export default BestSelling