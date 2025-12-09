import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import "./globals.css";

const inter = Inter({ 
    subsets: ["latin"], 
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

export const metadata = {
    title: "4joint - Mercado 420",
    description: "4joint - Tu mercado 420",
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://4joint.net'),
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: "4joint - Mercado 420",
        description: "Tu mercado multivendedor 420 en México",
        url: process.env.NEXT_PUBLIC_SITE_URL || 'https://4joint.net',
        siteName: '4joint',
        locale: 'es_MX',
        type: 'website',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="es-MX">
            <body className={`${inter.className} antialiased bg-[#FAFAF6]`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                <StoreProvider>
                    <Toaster 
                        position="top-center"
                        toastOptions={{
                            style: {
                                borderRadius: '9999px',
                                background: '#1A1A1A',
                                color: '#FAFAF6',
                            },
                        }}
                    />
                    {children}
                </StoreProvider>
            </body>
        </html>
    );
}
