'use client'
import React, { useEffect, useState } from 'react'
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

    useEffect(() => {
        loadSocialMedia();
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
        <div className='flex flex-col items-center mx-4 my-24 sm:my-32'>
            <Title title="Únete al Boletín" description="Suscríbete para recibir ofertas exclusivas, nuevos productos y actualizaciones directamente en tu correo cada semana." visibleButton={false} />
            <div className='flex bg-white text-sm p-1.5 rounded-full w-full max-w-xl my-10 border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow focus-within:border-[#00C6A2] focus-within:ring-2 focus-within:ring-[#00C6A2]/20'>
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
                            className='text-2xl hover:scale-125 transition-transform duration-300'
                            title={social.name}
                        >
                            {social.icon}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Newsletter