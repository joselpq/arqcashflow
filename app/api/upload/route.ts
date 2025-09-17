import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAuth } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob storage not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported. Use PDF, PNG, JPG, WebP, or GIF.' },
        { status: 400 }
      )
    }

    // Check file size - allow up to 32MB for PDFs, 10MB for images
    const maxSize = file.type === 'application/pdf' ? 32 * 1024 * 1024 : 10 * 1024 * 1024

    if (file.size > maxSize) {
      const maxMB = Math.floor(maxSize / 1024 / 1024)
      return NextResponse.json(
        { error: `File too large. Maximum ${maxMB}MB allowed for ${file.type === 'application/pdf' ? 'PDFs' : 'images'}.` },
        { status: 400 }
      )
    }

    // Create unique filename with team prefix to avoid collisions
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const blobPath = `uploads/${teamId}/${timestamp}_${cleanFileName}`

    console.log(`📤 Uploading file to blob: ${blobPath} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    console.log(`✅ File uploaded successfully: ${blob.url}`)

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      type: file.type,
      name: file.name
    })

  } catch (error) {
    console.error('File upload error:', error)

    if (error.message?.includes('BLOB_STORE_REQUEST_BODY_TOO_LARGE')) {
      return NextResponse.json(
        { error: 'File too large for upload. Please use a smaller file.' },
        { status: 413 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload file. Please try again.' },
      { status: 500 }
    )
  }
}