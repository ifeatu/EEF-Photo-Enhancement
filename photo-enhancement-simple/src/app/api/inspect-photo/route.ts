import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProductionGeminiService } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const { photoId } = await request.json();
    
    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }
    
    console.log('🔍 Debug enhancement for photo:', photoId);
    
    // Get photo details
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: {
        id: true,
        originalUrl: true,
        status: true,
        title: true,
        createdAt: true,
        user: {
          select: { email: true }
        }
      }
    });
    
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }
    
    console.log('📊 Photo details:', {
      id: photo.id,
      status: photo.status,
      title: photo.title,
      user: photo.user.email,
      originalUrl: photo.originalUrl.substring(0, 100) + '...'
    });
    
    // Test image download
    console.log('📥 Testing image download...');
    const https = require('https');
    const http = require('http');
    
    const downloadTest = await new Promise((resolve) => {
      const client = photo.originalUrl.startsWith('https:') ? https : http;
      
      const request = client.get(photo.originalUrl, (res: any) => {
        console.log('HTTP Response:', {
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          contentLength: res.headers['content-length']
        });
        
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            success: true,
            statusCode: res.statusCode,
            contentType: res.headers['content-type'],
            size: buffer.length,
            isValidImage: buffer.length > 100 && (
              buffer.toString('hex', 0, 4) === '89504e47' || // PNG
              buffer.toString('hex', 0, 4) === 'ffd8ffe0' || // JPEG
              buffer.toString('hex', 0, 4) === 'ffd8ffe1'    // JPEG
            )
          });
        });
      });
      
      request.on('error', (error: any) => {
        resolve({
          success: false,
          error: error.message
        });
      });
      
      request.setTimeout(10000, () => {
        resolve({
          success: false,
          error: 'Download timeout'
        });
      });
    });
    
    console.log('📥 Download result:', downloadTest);
    
    // If image download fails, that's the issue
    if (!(downloadTest as any).success) {
      return NextResponse.json({
        photo,
        downloadTest,
        diagnosis: 'Image download failed - this is why enhancement fails',
        recommendation: 'The original image URL is not accessible or corrupted'
      });
    }
    
    // If image is too small or invalid
    if ((downloadTest as any).size < 100 || !(downloadTest as any).isValidImage) {
      return NextResponse.json({
        photo,
        downloadTest,
        diagnosis: 'Invalid or corrupted image file',
        recommendation: 'The image file is corrupted or not a valid image format'
      });
    }
    
    // Test Gemini service initialization
    console.log('🤖 Testing Gemini service...');
    try {
      const geminiService = new ProductionGeminiService();
      const healthCheck = await geminiService.healthCheck();
      
      console.log('🤖 Gemini health check:', healthCheck);
      
      return NextResponse.json({
        photo,
        downloadTest,
        geminiHealth: healthCheck,
        diagnosis: 'Image and Gemini service are working - enhancement should succeed',
        recommendation: 'Try triggering enhancement again'
      });
      
    } catch (geminiError: any) {
      return NextResponse.json({
        photo,
        downloadTest,
        geminiError: geminiError.message,
        diagnosis: 'Gemini service initialization failed',
        recommendation: 'Check GOOGLE_AI_API_KEY configuration'
      });
    }
    
  } catch (error: any) {
    console.error('Debug enhancement error:', error);
    return NextResponse.json({
      error: error.message,
      diagnosis: 'Debug endpoint failed',
      recommendation: 'Check server logs for details'
    }, { status: 500 });
  }
}