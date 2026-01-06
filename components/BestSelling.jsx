'use client'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'

const BestSelling = () => {

    const displayQuantity = 8
    const products = useSelector(state => state.product.list)

    return (
        <div className='px-4 sm:px-6 my-12 sm:my-16 md:my-24 max-w-7xl mx-auto'>
            <Title title='Más Vendidos' description={`Mostrando ${products.length < displayQuantity ? products.length : displayQuantity} de ${products.length} productos`} href='/shop' />
            {products.length > 0 ? (
                // RESPONSIVE FIX: Mobile 1 column, tablet 2, desktop 3-4
                <div className='mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8'>
                    {products.slice().sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0)).slice(0, displayQuantity).map((product, index) => (
                        <ProductCard key={product.id || index} product={product} />
                    ))}
                </div>
            ) : (
                <div className='mt-12 text-center py-12'>
                    <p className='text-slate-500'>No hay productos disponibles</p>
                </div>
            )}
        </div>
    )
}

export default BestSelling