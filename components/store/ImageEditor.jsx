'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Check, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import Image from 'next/image'

/**
 * Image Editor Component with crop functionality
 * Allows users to crop and adjust images before uploading
 */
export default function ImageEditor({ 
    isOpen, 
    imageFile, 
    onSave, 
    onClose,
    aspectRatio = null // null for free crop, or { width: 1, height: 1 } for square, etc.
}) {
    const [imageSrc, setImageSrc] = useState(null)
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
    const [cropStyle, setCropStyle] = useState({ left: 0, top: 0, width: 0, height: 0 })
    const canvasRef = useRef(null)
    const imageRef = useRef(null)
    const containerRef = useRef(null)

    useEffect(() => {
        if (isOpen && imageFile) {
            const reader = new FileReader()
            reader.onload = (e) => {
                setImageSrc(e.target.result)
                // Reset crop and zoom when new image loads
                setZoom(1)
                setRotation(0)
            }
            reader.readAsDataURL(imageFile)
        } else {
            setImageSrc(null)
        }
    }, [isOpen, imageFile])

    useEffect(() => {
        if (imageSrc && imageRef.current && containerRef.current) {
            const img = imageRef.current
            const container = containerRef.current
            
            const updateImageSize = () => {
                // Wait for image to be rendered to get actual displayed size
                requestAnimationFrame(() => {
                    const imgRect = img.getBoundingClientRect()
                    
                    // Use actual rendered image dimensions as the crop coordinate space
                    // This ensures crop bounds match the visible image area
                    const actualWidth = imgRect.width
                    const actualHeight = imgRect.height
                    
                    if (actualWidth > 0 && actualHeight > 0 && img.naturalWidth > 0 && img.naturalHeight > 0) {
                        // imageSize represents the logical crop coordinate space
                        // It should match the actual rendered image size
                        // This ensures crop can move across the full visible image
                        setImageSize({ width: actualWidth, height: actualHeight })
                        
                        // Only initialize crop if it hasn't been set yet or if imageSize changed significantly
                        if (imageSize.width === 0 || Math.abs(imageSize.width - actualWidth) > 10) {
                            // Initialize crop to center - use 80% of the smaller dimension
                            const cropSize = Math.min(actualWidth, actualHeight) * 0.8
                            setCrop({
                                x: (actualWidth - cropSize) / 2,
                                y: (actualHeight - cropSize) / 2,
                                width: cropSize,
                                height: cropSize
                            })
                        }
                    }
                })
            }
            
            const handleImageLoad = () => {
                updateImageSize()
            }
            
            if (img.complete && img.naturalWidth > 0) {
                handleImageLoad()
            } else {
                img.onload = handleImageLoad
            }
            
            // Also update on zoom/rotation changes
            const resizeObserver = new ResizeObserver(updateImageSize)
            resizeObserver.observe(img)
            resizeObserver.observe(container)
            
            return () => {
                resizeObserver.disconnect()
            }
        }
    }, [imageSrc, zoom, rotation])

    // Update crop overlay position based on actual image rendering
    useEffect(() => {
        const updateCropPosition = () => {
            const rect = containerRef.current?.getBoundingClientRect()
            const img = imageRef.current
            if (!rect || !img || imageSize.width === 0 || imageSize.height === 0) {
                return
            }
            
            const imgRect = img.getBoundingClientRect()
            
            // Calculate scale: imageSize should match rendered size, so scale should be 1:1
            // But account for zoom/rotation transformations
            const scaleX = imageSize.width > 0 ? imgRect.width / imageSize.width : 1
            const scaleY = imageSize.height > 0 ? imgRect.height / imageSize.height : 1
            
            // Image offset within container (centered)
            const imageOffsetX = (rect.width - imgRect.width) / 2
            const imageOffsetY = (rect.height - imgRect.height) / 2
            
            // Crop overlay position: offset + (logical crop position * scale)
            setCropStyle({
                left: imageOffsetX + (crop.x * scaleX),
                top: imageOffsetY + (crop.y * scaleY),
                width: crop.width * scaleX,
                height: crop.height * scaleY
            })
        }

        updateCropPosition()
        
        // Update on window resize and image changes
        const handleResize = () => updateCropPosition()
        window.addEventListener('resize', handleResize)
        
        // Use requestAnimationFrame for smooth updates
        let rafId = requestAnimationFrame(() => {
            updateCropPosition()
            rafId = requestAnimationFrame(updateCropPosition)
        })
        
        return () => {
            window.removeEventListener('resize', handleResize)
            cancelAnimationFrame(rafId)
        }
    }, [crop, zoom, rotation, imageSize])

    // Removed unused handleCropChange function

    const handleCropResize = (direction, deltaX, deltaY) => {
        setCrop(prev => {
            let newCrop = { ...prev }
            const minSize = 50

            switch (direction) {
                case 'se': // South-east
                    newCrop.width = Math.max(minSize, Math.min(prev.width + deltaX, imageSize.width - prev.x))
                    newCrop.height = aspectRatio 
                        ? newCrop.width / (aspectRatio.width / aspectRatio.height)
                        : Math.max(minSize, Math.min(prev.height + deltaY, imageSize.height - prev.y))
                    break
                case 'sw': // South-west
                    const newWidth = Math.max(minSize, Math.min(prev.width - deltaX, prev.x + prev.width))
                    const newHeight = aspectRatio 
                        ? newWidth / (aspectRatio.width / aspectRatio.height)
                        : Math.max(minSize, Math.min(prev.height + deltaY, imageSize.height - prev.y))
                    newCrop.x = prev.x + prev.width - newWidth
                    newCrop.width = newWidth
                    newCrop.height = newHeight
                    break
                case 'ne': // North-east
                    const newWidthNE = Math.max(minSize, Math.min(prev.width + deltaX, imageSize.width - prev.x))
                    const newHeightNE = aspectRatio 
                        ? newWidthNE / (aspectRatio.width / aspectRatio.height)
                        : Math.max(minSize, Math.min(prev.height - deltaY, prev.y + prev.height))
                    newCrop.y = prev.y + prev.height - newHeightNE
                    newCrop.width = newWidthNE
                    newCrop.height = newHeightNE
                    break
                case 'nw': // North-west
                    const newWidthNW = Math.max(minSize, Math.min(prev.width - deltaX, prev.x + prev.width))
                    const newHeightNW = aspectRatio 
                        ? newWidthNW / (aspectRatio.width / aspectRatio.height)
                        : Math.max(minSize, Math.min(prev.height - deltaY, prev.y + prev.height))
                    newCrop.x = prev.x + prev.width - newWidthNW
                    newCrop.y = prev.y + prev.height - newHeightNW
                    newCrop.width = newWidthNW
                    newCrop.height = newHeightNW
                    break
            }

            // Keep crop within image bounds
            newCrop.x = Math.max(0, Math.min(newCrop.x, imageSize.width - newCrop.width))
            newCrop.y = Math.max(0, Math.min(newCrop.y, imageSize.height - newCrop.height))
            newCrop.width = Math.min(newCrop.width, imageSize.width - newCrop.x)
            newCrop.height = Math.min(newCrop.height, imageSize.height - newCrop.y)

            return newCrop
        })
    }

    const getCroppedImage = async () => {
        if (!imageRef.current || !canvasRef.current) return null

        const img = imageRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        // Calculate actual crop coordinates on original image
        // imageSize now represents the rendered size, so we need to scale from rendered to natural
        // crop coordinates are in rendered image space, so convert to natural image space
        const renderedWidth = imageSize.width  // This is the actual rendered width
        const renderedHeight = imageSize.height // This is the actual rendered height
        
        // Scale factor: how rendered size maps to natural size
        const scaleX = img.naturalWidth / renderedWidth
        const scaleY = img.naturalHeight / renderedHeight

        // Crop coordinates are in rendered space, convert to natural image space
        const sourceX = crop.x * scaleX
        const sourceY = crop.y * scaleY
        const sourceWidth = crop.width * scaleX
        const sourceHeight = crop.height * scaleY
        
        // Ensure coordinates are within image bounds
        const clampedSourceX = Math.max(0, Math.min(sourceX, img.naturalWidth))
        const clampedSourceY = Math.max(0, Math.min(sourceY, img.naturalHeight))
        const clampedSourceWidth = Math.min(sourceWidth, img.naturalWidth - clampedSourceX)
        const clampedSourceHeight = Math.min(sourceHeight, img.naturalHeight - clampedSourceY)

        // Set canvas size to crop size (or desired output size)
        const outputSize = 800 // Max output size
        const outputAspect = sourceWidth / sourceHeight
        let outputWidth, outputHeight

        if (outputAspect > 1) {
            outputWidth = outputSize
            outputHeight = outputSize / outputAspect
        } else {
            outputHeight = outputSize
            outputWidth = outputSize * outputAspect
        }

        canvas.width = outputWidth
        canvas.height = outputHeight

        // Apply rotation if needed
        if (rotation !== 0) {
            ctx.save()
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate((rotation * Math.PI) / 180)
            ctx.translate(-canvas.width / 2, -canvas.height / 2)
        }

        // Draw cropped image using clamped coordinates
        ctx.drawImage(
            img,
            clampedSourceX, clampedSourceY, clampedSourceWidth, clampedSourceHeight,
            0, 0, outputWidth, outputHeight
        )

        if (rotation !== 0) {
            ctx.restore()
        }

        // Convert to blob with explicit MIME type
        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    reject(new Error('Failed to create image blob'))
                    return
                }
                
                // Always recreate blob with explicit type to ensure it's correct
                // Read blob as ArrayBuffer to ensure we have the raw data
                const arrayBuffer = await blob.arrayBuffer()
                // Create new blob with explicit JPEG type
                const typedBlob = new Blob([arrayBuffer], { type: 'image/jpeg' })
                
                if (process.env.NODE_ENV !== 'production') {
                    console.log('Blob created from canvas:', {
                        originalType: blob.type,
                        newType: typedBlob.type,
                        size: typedBlob.size
                    })
                }
                
                resolve(typedBlob)
            }, 'image/jpeg', 0.92)
        })
    }

    const handleSave = async () => {
        let croppedBlob = await getCroppedImage()
        if (croppedBlob) {
            // Log blob details
            if (process.env.NODE_ENV !== 'production') {
                console.log('Blob from canvas:', {
                    type: croppedBlob.type,
                    size: croppedBlob.size,
                    isBlob: croppedBlob instanceof Blob
                })
            }
            
            // Ensure blob type is correct - ALWAYS recreate to guarantee type
            if (croppedBlob.type !== 'image/jpeg') {
                console.warn('Blob type mismatch, correcting:', croppedBlob.type)
                croppedBlob = new Blob([croppedBlob], { type: 'image/jpeg' })
            }
            
            // Generate filename with .jpg extension
            const fileName = imageFile.name.replace(/\.[^/.]+$/, '') + '.jpg'
            
            // Create a File object from the blob - ensure type is explicitly set
            const croppedFile = new File([croppedBlob], fileName, {
                type: 'image/jpeg', // Explicitly set type
                lastModified: Date.now()
            })
            
            // Verify file type before saving
            if (croppedFile.type !== 'image/jpeg') {
                console.error('File type verification failed:', croppedFile.type)
                // Try one more time with explicit type
                const finalFile = new File([croppedBlob], fileName, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                })
                if (finalFile.type !== 'image/jpeg') {
                    alert('Error: No se pudo crear un archivo de imagen válido')
                    return
                }
                onSave(finalFile)
                onClose()
                return
            }
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('Cropped file created:', {
                    name: croppedFile.name,
                    type: croppedFile.type,
                    size: croppedFile.size,
                    isFile: croppedFile instanceof File
                })
            }
            
            onSave(croppedFile)
        }
        onClose()
    }

    if (!isOpen || !imageSrc) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-800">Editar Imagen</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Image Editor Area */}
                <div className="flex-1 overflow-auto p-6">
                    <div 
                        ref={containerRef}
                        className="relative bg-slate-100 rounded-lg mx-auto overflow-hidden"
                        style={{ 
                            width: '100%', 
                            minHeight: '400px',
                            height: '500px', 
                            maxWidth: '800px',
                            maxHeight: '600px'
                        }}
                    >
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                ref={imageRef}
                                src={imageSrc}
                                alt="Preview"
                                className="block"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    width: 'auto',
                                    height: 'auto',
                                    objectFit: 'contain',
                                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                    transition: 'transform 0.2s',
                                    willChange: 'transform'
                                }}
                            />
                            
                            {/* Crop Overlay - positioned dynamically based on image position */}
                            <div
                                className="absolute border-2 border-[#00C6A2] cursor-move bg-transparent z-10"
                                style={{
                                    left: `${cropStyle.left}px`,
                                    top: `${cropStyle.top}px`,
                                    width: `${cropStyle.width}px`,
                                    height: `${cropStyle.height}px`,
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                                    pointerEvents: 'auto'
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    
                                    const rect = containerRef.current?.getBoundingClientRect()
                                    const img = imageRef.current
                                    if (!rect || !img || imageSize.width === 0) return
                                    
                                    const imgRect = img.getBoundingClientRect()
                                    const scaleX = imgRect.width / imageSize.width
                                    const scaleY = imgRect.height / imageSize.height
                                    const imageOffsetX = (rect.width - imgRect.width) / 2
                                    const imageOffsetY = (rect.height - imgRect.height) / 2
                                    
                                    // Current crop position in screen coordinates
                                    const cropScreenX = rect.left + imageOffsetX + (crop.x * scaleX)
                                    const cropScreenY = rect.top + imageOffsetY + (crop.y * scaleY)
                                    
                                    // Mouse offset from crop box
                                    const offsetX = e.clientX - cropScreenX
                                    const offsetY = e.clientY - cropScreenY
                                    
                                    const handleMouseMove = (moveEvent) => {
                                        if (!rect || !img || imageSize.width === 0) return
                                        
                                        const currentImgRect = img.getBoundingClientRect()
                                        const currentScaleX = currentImgRect.width / imageSize.width
                                        const currentScaleY = currentImgRect.height / imageSize.height
                                        const currentImageOffsetX = (rect.width - currentImgRect.width) / 2
                                        const currentImageOffsetY = (rect.height - currentImgRect.height) / 2
                                        
                                        // Mouse position relative to container
                                        const mouseX = moveEvent.clientX - rect.left
                                        const mouseY = moveEvent.clientY - rect.top
                                        
                                        // Convert to imageSize coordinates
                                        const newX = (mouseX - currentImageOffsetX - offsetX) / currentScaleX
                                        const newY = (mouseY - currentImageOffsetY - offsetY) / currentScaleY
                                        
                                        // Constrain to image bounds - FIX: use actual imageSize bounds
                                        setCrop(prev => {
                                            // Calculate max values based on logical imageSize
                                            // imageSize represents the full cropable area
                                            const maxX = Math.max(0, imageSize.width - prev.width)
                                            const maxY = Math.max(0, imageSize.height - prev.height)
                                            
                                            // Clamp to valid bounds - ensure crop stays within image
                                            const clampedX = Math.max(0, Math.min(newX, maxX))
                                            const clampedY = Math.max(0, Math.min(newY, maxY))
                                            
                                            return {
                                                ...prev,
                                                x: clampedX,
                                                y: clampedY
                                            }
                                        })
                                    }
                                    
                                    const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove)
                                        document.removeEventListener('mouseup', handleMouseUp)
                                    }
                                    
                                    document.addEventListener('mousemove', handleMouseMove)
                                    document.addEventListener('mouseup', handleMouseUp)
                                }}
                            >
                                {/* Resize Handles */}
                                {['nw', 'ne', 'sw', 'se'].map((corner) => (
                                    <div
                                        key={corner}
                                        className="absolute w-4 h-4 bg-[#00C6A2] border-2 border-white rounded-full cursor-nwse-resize"
                                        style={{
                                            [corner.includes('n') ? 'top' : 'bottom']: '-6px',
                                            [corner.includes('w') ? 'left' : 'right']: '-6px'
                                        }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation()
                                            const startX = e.clientX
                                            const startY = e.clientY
                                            const startCrop = { ...crop }
                                            
                                            const handleMouseMove = (e) => {
                                                const deltaX = e.clientX - startX
                                                const deltaY = e.clientY - startY
                                                handleCropResize(corner, deltaX, deltaY)
                                            }
                                            
                                            const handleMouseUp = () => {
                                                document.removeEventListener('mousemove', handleMouseMove)
                                                document.removeEventListener('mouseup', handleMouseUp)
                                            }
                                            
                                            document.addEventListener('mousemove', handleMouseMove)
                                            document.addEventListener('mouseup', handleMouseUp)
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Hidden canvas for cropping */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls */}
                <div className="p-4 border-t border-slate-200 space-y-4">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-700 w-20">Zoom:</label>
                        <button
                            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label="Reducir zoom"
                        >
                            <ZoomOut size={18} className="text-slate-600" />
                        </button>
                        <span className="text-sm text-slate-600 w-16 text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label="Aumentar zoom"
                        >
                            <ZoomIn size={18} className="text-slate-600" />
                        </button>
                    </div>

                    {/* Rotation Control */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-700 w-20">Rotar:</label>
                        <button
                            onClick={() => setRotation(prev => (prev + 90) % 360)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                            aria-label="Rotar 90 grados"
                        >
                            <RotateCw size={18} className="text-slate-600" />
                            <span className="text-sm text-slate-600">{rotation}°</span>
                        </button>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-gradient-to-r from-[#00C6A2] to-[#00B894] text-white rounded-lg hover:from-[#00B894] hover:to-[#00A885] transition-all font-medium flex items-center gap-2 shadow-lg"
                    >
                        <Check size={18} />
                        Aplicar Recorte
                    </button>
                </div>
            </div>
        </div>
    )
}

