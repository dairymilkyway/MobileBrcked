const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const fs = require('fs');
const unlinkAsync = promisify(fs.unlink);

// Debug environment variables
console.log('Cloudinary Utils - Config Variables:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);

// Configure cloudinary with explicit values (not relying on env variables for debugging)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwtswcpfw',
  api_key: process.env.CLOUDINARY_API_KEY || '234243897381997',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'wz5JH8Nx4M10fl88SOaNV1m4aLc'
});

// Log configuration status
console.log('Cloudinary Configuration Status:');
console.log('Config is valid:', cloudinary.config().api_key && cloudinary.config().api_secret ? 'YES' : 'NO');

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Path to the file to upload
 * @param {string} folder - Folder to upload to in Cloudinary
 * @returns {Promise<object>} - Cloudinary upload result
 */
const uploadToCloudinary = async (filePath, folder = 'brcked_products') => {
  try {
    console.log(`Uploading file to Cloudinary: ${filePath}`);
    console.log('Using cloud_name:', cloudinary.config().cloud_name);
    console.log('API key exists:', !!cloudinary.config().api_key);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto'
    });
    
    console.log('Cloudinary upload successful:', result.secure_url);
    
    // Delete local file after upload
    await unlinkAsync(filePath);
    console.log('Local file deleted:', filePath);
    
    return result;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    // Still delete local file if upload failed
    try {
      await unlinkAsync(filePath);
      console.log('Local file deleted after error:', filePath);
    } catch (unlinkError) {
      console.error('Error deleting local file after failed upload:', unlinkError);
    }
    throw error;
  }
};

/**
 * Delete a file from Cloudinary by URL
 * @param {string} cloudinaryUrl - Full Cloudinary URL to delete
 * @returns {Promise<object>} - Cloudinary deletion result
 */
const deleteFromCloudinary = async (cloudinaryUrl) => {
  try {
    // Extract public_id from URL
    // Format: https://res.cloudinary.com/[cloud_name]/image/upload/v[version]/[folder]/[public_id].[ext]
    const urlParts = cloudinaryUrl.split('/');
    const filenameWithExtension = urlParts[urlParts.length - 1];
    const publicIdWithExtension = urlParts.slice(-2).join('/');
    const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
    
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary
}; 