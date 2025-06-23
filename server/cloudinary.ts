import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables
dotenv.config();

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = cloudName && apiKey && apiSecret;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  console.log('Cloudinary configured successfully');
} else {
  console.warn('Cloudinary credentials not found. QR code and file upload features will be disabled.');
}

export interface UploadResult {
  url: string;
  public_id: string;
  secure_url: string;
}

/**
 * Upload a file buffer to Cloudinary
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  options: {
    folder?: string;
    public_id?: string;
    resource_type?: 'image' | 'raw' | 'video' | 'auto';
    format?: string;
  } = {}
): Promise<UploadResult> => {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary is not configured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'greenpath',
      public_id: options.public_id,
      resource_type: options.resource_type || 'auto',
      format: options.format,
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.url,
            public_id: result.public_id,
            secure_url: result.secure_url,
          });
        } else {
          reject(new Error('Upload failed - no result'));
        }
      }
    ).end(buffer);
  });
};

/**
 * Delete a file from Cloudinary
 */
export const deleteFromCloudinary = async (
  public_id: string,
  resource_type: 'image' | 'raw' | 'video' = 'image'
): Promise<void> => {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary is not configured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
  }
  await cloudinary.uploader.destroy(public_id, { resource_type });
};

/**
 * Generate a signed URL for secure access
 */
export const generateSignedUrl = (
  public_id: string,
  options: {
    resource_type?: 'image' | 'raw' | 'video';
    format?: string;
    transformation?: any;
  } = {}
): string => {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary is not configured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
  }
  return cloudinary.url(public_id, {
    resource_type: options.resource_type || 'image',
    format: options.format,
    transformation: options.transformation,
    sign_url: true,
  });
};

export default cloudinary;