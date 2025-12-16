const { PrismaClient } = require('@prisma/client');

async function checkPhoto() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.POSTGRES_PRISMA_URL
  });

  try {
    console.log('Checking failed photo: cmfg34ktm00033lg9d20ydm02');
    
    const photo = await prisma.photo.findUnique({
      where: { id: 'cmfg34ktm00033lg9d20ydm02' },
      include: {
        user: {
          select: { email: true, role: true }
        }
      }
    });
    
    if (photo) {
      console.log('Photo found:', {
        id: photo.id,
        status: photo.status,
        originalUrl: photo.originalUrl,
        enhancedUrl: photo.enhancedUrl,
        createdAt: photo.createdAt,
        updatedAt: photo.updatedAt,
        user: photo.user.email,
        title: photo.title
      });
      
      // Test the original URL
      console.log('Testing image URL...');
      const https = require('https');
      const http = require('http');
      
      const client = photo.originalUrl.startsWith('https:') ? https : http;
      client.get(photo.originalUrl, (res) => {
        console.log('URL response:', {
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          contentLength: res.headers['content-length']
        });
        
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log('Image size:', buffer.length, 'bytes');
          
          if (buffer.length < 100) {
            console.log('Image content:', buffer.toString());
          }
        });
      }).on('error', (err) => {
        console.error('URL fetch error:', err.message);
      });
    } else {
      console.log('Photo not found');
    }
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

checkPhoto();