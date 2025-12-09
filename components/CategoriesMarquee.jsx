'use client'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCategories } from "@/lib/supabase/database"

const CategoriesMarquee = () => {
    const router = useRouter()
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const uniqueCategories = await getCategories()
                // Remove duplicates and limit to 3 categories
                const unique = [...new Set(uniqueCategories)]
                setCategories(unique.slice(0, 3))
            } catch (error) {
                console.error('Error fetching categories:', error)
                // Fallback to default categories (limited to 3)
                setCategories(["Extractos", "Flores", "Accesorios"])
            } finally {
                setLoading(false)
            }
        }
        fetchCategories()
    }, [])

    const handleCategoryClick = (category) => {
        router.push(`/shop?category=${encodeURIComponent(category)}`)
    }

    if (loading) {
        return null // Or a loading skeleton
    }

    // Static display - no animation, just show the categories
    return (
        <div className="w-full relative max-w-7xl mx-auto select-none sm:my-20">
            <div className="flex justify-center gap-4 flex-wrap">
                {categories.map((category, index) => (
                    <button 
                        key={`${category}-${index}`} 
                        onClick={() => handleCategoryClick(category)}
                        className="px-5 py-2 bg-white/80 backdrop-blur-sm rounded-full text-[#1A1A1A]/70 text-xs sm:text-sm hover:bg-[#00C6A2] hover:text-white active:scale-95 transition-all duration-300 border border-[#00C6A2]/20 shadow-sm"
                    >
                        {category}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CategoriesMarquee;