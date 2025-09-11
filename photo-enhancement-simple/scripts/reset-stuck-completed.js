/**
 * Reset Specific Stuck Completed Photo
 * Reset the photo status and trigger reprocessing
 */

const PHOTO_ID = 'cmfftfmxf00052rgwsd4md3sz';
const PRODUCTION_URL = 'https://photoenhance.dev';

async function resetAndReprocess() {
  console.log(`🔄 Resetting photo ${PHOTO_ID}...`);
  
  try {
    // First, get the current stuck photos to process them
    const response = await fetch(`${PRODUCTION_URL}/api/photos/process-stuck`, {
      method: 'POST',
      headers: {
        'X-Internal-Service': 'stuck-photo-monitor'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Stuck photo processing triggered:', result.message);
      console.log(`📊 Results: ${result.results.succeeded} succeeded, ${result.results.failed} failed`);
      
      if (result.results.errors.length > 0) {
        console.log('❌ Errors:');
        result.results.errors.forEach(error => {
          console.log(`  - Photo ${error.photoId}: ${error.error}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to process stuck photos: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetAndReprocess();