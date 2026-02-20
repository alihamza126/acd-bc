export interface StorageConfig {
  provider: 'aws' | 'cloudinary';
  aws?: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

export const getStorageConfig = (): StorageConfig => ({
  provider: (process.env.STORAGE_PROVIDER as 'aws' | 'cloudinary') || 'aws',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
});
