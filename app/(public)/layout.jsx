'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";
import OnboardingCheck from "@/components/OnboardingCheck";
import SmokeParticles from "@/components/SmokeParticles";
import ProductLoader from "@/components/ProductLoader";

export default function PublicLayout({ children }) {

    return (
        <>
            <AgeGate />
            <OnboardingCheck />
            <SmokeParticles />
            <ProductLoader />
            <Banner />
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
