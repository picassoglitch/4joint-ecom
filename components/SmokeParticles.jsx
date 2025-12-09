'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function SmokeParticles() {
    const [particles, setParticles] = useState([])

    useEffect(() => {
        const particleCount = 20
        const newParticles = Array.from({ length: particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: 100 + Math.random() * 20,
            delay: Math.random() * 2,
            duration: 8 + Math.random() * 4,
            size: 4 + Math.random() * 6,
        }))
        setParticles(newParticles)
    }, [])

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full bg-[#00C6A2]/20"
                    style={{
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        left: `${particle.x}%`,
                        bottom: `${particle.y}%`,
                    }}
                    animate={{
                        y: -800,
                        x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
                        opacity: [0.3, 0.6, 0],
                        scale: [1, 1.5, 2],
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: "easeOut",
                    }}
                />
            ))}
        </div>
    )
}

