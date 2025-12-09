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
        <div className='flex flex-col items-center mx-4 my-36'>
            <Title title="Únete al Boletín" description="Suscríbete para recibir ofertas exclusivas, nuevos productos y actualizaciones directamente en tu correo cada semana." visibleButton={false} />
            <div className='flex bg-slate-100 text-sm p-1 rounded-full w-full max-w-xl my-10 border-2 border-white ring ring-slate-200'>
                <input className='flex-1 pl-5 outline-none' type="text" placeholder='Ingresa tu correo electrónico' />
                <button className='font-medium bg-[#00C6A2] hover:bg-[#00B894] text-white px-7 py-3 rounded-full hover:scale-103 active:scale-95 transition'>Suscribirse</button>
            </div>
            {socialLinks.length > 0 && (
                <div className='flex items-center gap-4 mt-6'>
                    <span className='text-sm text-[#1A1A1A]/70'>Síguenos:</span>
                    {socialLinks.map((social, index) => (
                        <Link
                            key={index}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className='text-2xl hover:scale-110 transition-transform'
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