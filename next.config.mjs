/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
        ],
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
};

export default nextConfig;
