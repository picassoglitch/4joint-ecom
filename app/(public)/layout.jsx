'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";
import SmokeParticles from "@/components/SmokeParticles";
import ProductLoader from "@/components/ProductLoader";

export default function PublicLayout({ children }) {

    return (
        <>
            <AgeGate />
            <SmokeParticles />
            <ProductLoader />
            <Banner />
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
