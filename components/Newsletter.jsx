'use client'
import React, { useEffect, useState, useRef } from 'react'
import Title from './Title'
import { getSocialMediaLinks } from '@/lib/supabase/siteConfig'
import Link from 'next/link'

const Newsletter = () => {
    const [socialMedia, setSocialMedia] = useState({
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        tiktok: '',
        youtube: ''
    });
    const [isVisible, setIsVisible] = useState(false);
    const newsletterRef = useRef(null);

    useEffect(() => {
        loadSocialMedia();
    }, []);

    // Scroll reveal
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (newsletterRef.current) {
            observer.observe(newsletterRef.current);
        }

        return () => {
            if (newsletterRef.current) {
                observer.unobserve(newsletterRef.current);
            }
        };
    }, []);

    const loadSocialMedia = async () => {
        try {
            const social = await getSocialMediaLinks();
            setSocialMedia(social);
        } catch (error) {
            console.error('Error loading social media:', error);
        }
    };

    const socialLinks = [
        { name: 'Facebook', url: socialMedia.facebook, icon: '📘' },
        { name: 'Instagram', url: socialMedia.instagram, icon: '📷' },
        { name: 'Twitter', url: socialMedia.twitter, icon: '🐦' },
        { name: 'LinkedIn', url: socialMedia.linkedin, icon: '💼' },
        { name: 'TikTok', url: socialMedia.tiktok, icon: '🎵' },
        { name: 'YouTube', url: socialMedia.youtube, icon: '▶️' },
    ].filter(item => item.url && item.url !== '');

    return (
        <section 
            ref={newsletterRef}
            className={`flex flex-col items-center mx-4 my-4 sm:my-6 py-6 transition-all duration-700 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
            <div className="mb-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">
                    Únete al Boletín
                </h2>
                <p className="text-sm text-[#1A1A1A]/60 max-w-xl mx-auto">
                    Suscríbete para recibir ofertas exclusivas, nuevos productos y actualizaciones directamente en tu correo cada semana.
                </p>
            </div>
            <div className='flex bg-white/90 backdrop-blur-sm text-sm p-1.5 rounded-full w-full max-w-xl my-6 border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 focus-within:border-[#00C6A2] focus-within:ring-2 focus-within:ring-[#00C6A2]/20'>
                <input className='flex-1 pl-6 outline-none bg-transparent text-[#1A1A1A] placeholder-slate-400' type="email" placeholder='Ingresa tu correo electrónico' />
                <button className='font-bold bg-gradient-to-r from-[#00C6A2] to-[#00B894] hover:from-[#00B894] hover:to-[#00A885] text-white px-8 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg'>Suscribirse</button>
            </div>
            {socialLinks.length > 0 && (
                <div className='flex items-center gap-4 mt-6'>
                    <span className='text-sm text-[#1A1A1A]/70 font-medium'>Síguenos:</span>
                    {socialLinks.map((social, index) => (
                        <Link
                            key={index}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className='text-2xl hover:scale-125 transition-transform duration-300 hover:rotate-6'
                            title={social.name}
                        >
                            {social.icon}
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

export default Newsletter