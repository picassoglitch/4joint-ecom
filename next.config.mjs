/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
            {
                protocol: 'https',
                hostname: 'yqttcfpeebdycpyjmnrv.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
            // FIX: Explicit pattern for Supabase storage public URLs
            {
                protocol: 'https',
                hostname: 'yqttcfpeebdycpyjmnrv.supabase.co',
                pathname: '/storage/v1/object/public/product-images/**',
            },
        ],
        // Fallback for older Next.js versions
        domains: ['yqttcfpeebdycpyjmnrv.supabase.co'],
    },
    // Configuración para dominio personalizado
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Domain',
                        value: process.env.NEXT_PUBLIC_SITE_URL || '4joint.net',
                    },
                ],
            },
        ]
    },
    // Fix for Turbopack metadata issues
    experimental: {
        turbo: {
            resolveAlias: {
                // Prevent favicon routing issues
            },
        },
    },
};

export default nextConfig;
