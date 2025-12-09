'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import { getCurrentVendor } from "@/lib/supabase/database"
import { isVendor, getCurrentUser } from "@/lib/supabase/auth"
import toast from "react-hot-toast"

const StoreLayout = ({ children }) => {
    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)

    const fetchIsSeller = async () => {
        try {
            const { user } = await getCurrentUser()
            
            if (!user) {
                setIsSeller(false)
                setLoading(false)
                return
            }

            // Check if user is vendor
            const userIsVendor = isVendor(user)
            
            if (!userIsVendor) {
                setIsSeller(false)
                setLoading(false)
                return
            }

            // Get vendor data
            const vendor = await getCurrentVendor()
            
            if (vendor) {
                setIsSeller(true)
                setStoreInfo({
                    id: vendor.id,
                    name: vendor.name,
                    logo: vendor.logo,
                    email: vendor.email,
                    description: vendor.description,
                    username: vendor.username,
                    approved: vendor.approved,
                })
            } else {
                // User is vendor but doesn't have a store registered yet
                setIsSeller(true) // Allow access to create store
                setStoreInfo(null)
            }
        } catch (error) {
            console.error('Error fetching vendor data:', error)
            setIsSeller(false)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIsSeller()
    }, [])

    return loading ? (
        <Loading />
    ) : isSeller ? (
        <div className="flex flex-col h-screen">
            <SellerNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                {storeInfo && <SellerSidebar storeInfo={storeInfo} />}
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">No estás autorizado para acceder a esta página</h1>
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full">
                Ir al inicio <ArrowRightIcon size={18} />
            </Link>
        </div>
    )
}

export default StoreLayout