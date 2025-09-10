const fs = require('fs');
const path = require('path');

async function copyUploadedPhotos() {
  try {
    console.log('📸 Copying uploaded photos to current directory...');
    
    // Source directory (uploads)
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    
    // Destination directory (current working directory)
    const destDir = process.cwd();
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Uploads directory does not exist');
      return;
    }
    
    const files = fs.readdirSync(uploadsDir);
    console.log(`📋 Found ${files.length} files in uploads directory`);
    
    if (files.length === 0) {
      console.log('✅ No files to copy');
      return;
    }
    
    let copiedCount = 0;
    
    files.forEach((file, index) => {
      try {
        const sourcePath = path.join(uploadsDir, file);
        
        // Create a cleaner filename
        const cleanFilename = `photo_${index + 1}_${file.replace(/^\d+-/, '')}`;
        const destPath = path.join(destDir, cleanFilename);
        
        // Get file stats
        const stats = fs.statSync(sourcePath);
        
        console.log(`\n📁 Copying file ${index + 1}/${files.length}:`);
        console.log(`   Source: ${file}`);
        console.log(`   Destination: ${cleanFilename}`);
        console.log(`   Size: ${Math.round(stats.size / 1024)}KB`);
        console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
        
        // Copy the file
        fs.copyFileSync(sourcePath, destPath);
        console.log(`   ✅ Copied successfully`);
        
        copiedCount++;
        
      } catch (error) {
        console.error(`   ❌ Error copying ${file}:`, error.message);
      }
    });
    
    console.log(`\n🎉 Copy process completed!`);
    console.log(`📊 Successfully copied ${copiedCount}/${files.length} files`);
    
    // List the copied files in current directory
    console.log(`\n📋 Files now in current directory:`);
    const currentFiles = fs.readdirSync(destDir)
      .filter(file => file.startsWith('photo_') && file.endsWith('.JPG'))
      .sort();
    
    currentFiles.forEach(file => {
      const filePath = path.join(destDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });
    
    if (currentFiles.length > 0) {
      console.log(`\n✨ All photos are now available in: ${destDir}`);
    }
    
  } catch (error) {
    console.error('❌ Error copying photos:', error);
  }
}

// Run the script
copyUploadedPhotos();