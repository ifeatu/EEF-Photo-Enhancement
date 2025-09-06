module.exports = async ({ strapi }) => {
  try {
    // Update photo status directly
    const updatedPhoto = await strapi.entityService.update('api::photo.photo', 'tdslr6oukwr5u8gktxslq9r7', {
      data: {
        status: 'pending',
        processingStarted: null,
        processingCompleted: null,
        errorMessage: null
      }
    });
    
    console.log('Photo status reset successfully:', updatedPhoto.status);
    return updatedPhoto;
  } catch (error) {
    console.error('Error resetting photo status:', error.message);
    throw error;
  }
};