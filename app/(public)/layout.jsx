'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";
import OnboardingCheck from "@/components/OnboardingCheck";
import SmokeParticles from "@/components/SmokeParticles";
import ProductLoader from "@/components/ProductLoader";
import MicroMessageBar from "@/components/MicroMessageBar";
import ExplorationBlocks from "@/components/ExplorationBlocks";
import { usePathname } from "next/navigation";

export default function PublicLayout({ children }) {
    const pathname = usePathname()
    // Show exploration blocks on most pages except checkout/payment/admin
    const showExploration = !pathname?.includes('/payment') && 
                           !pathname?.includes('/admin') && 
                           !pathname?.includes('/store') &&
                           pathname !== '/cart'

    return (
        <>
            <AgeGate />
            <OnboardingCheck />
            <SmokeParticles />
            <ProductLoader />
            <Banner />
            <MicroMessageBar />
            <Navbar />
            {/* RESPONSIVE FIX: Responsive container with proper padding */}
            <main className="min-h-screen w-full overflow-x-hidden">
                {children}
                {showExploration && <ExplorationBlocks />}
            </main>
            <Footer />
        </>
    );
}
