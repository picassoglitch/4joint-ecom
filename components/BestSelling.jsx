'use client'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'

const BestSelling = () => {

    const displayQuantity = 8
    const products = useSelector(state => state.product.list)

    return (
        <div className='px-6 my-20 sm:my-28 max-w-7xl mx-auto'>
            <Title title='Más Vendidos' description={`Mostrando ${products.length < displayQuantity ? products.length : displayQuantity} de ${products.length} productos`} href='/shop' />
            {products.length > 0 ? (
                <div className='mt-16 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8'>
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