import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import { getStorageConfig } from '../config/storage.config';

export interface UploadResult {
  url: string;
  publicId?: string;
  key?: string;
}

export interface UploadFromUrlResult extends UploadResult {
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly config: ReturnType<typeof getStorageConfig>;
  private s3Client: S3Client | null = null;

  constructor(private configService: ConfigService) {
    this.config = getStorageConfig();
    this.initializeStorage();
  }

  private initializeStorage() {
    if (this.config.provider === 'aws') {
      if (!this.config.aws?.accessKeyId || !this.config.aws?.secretAccessKey || !this.config.aws?.bucket) {
        this.logger.warn('AWS S3 credentials not configured. Storage service disabled.');
        return;
      }
      this.s3Client = new S3Client({
        region: this.config.aws.region,
        credentials: {
          accessKeyId: this.config.aws.accessKeyId,
          secretAccessKey: this.config.aws.secretAccessKey,
        },
      });
      this.logger.log('AWS S3 storage initialized');
    } else if (this.config.provider === 'cloudinary') {
      if (!this.config.cloudinary?.cloudName || !this.config.cloudinary?.apiKey || !this.config.cloudinary?.apiSecret) {
        this.logger.warn('Cloudinary credentials not configured. Storage service disabled.');
        return;
      }
      cloudinary.config({
        cloud_name: this.config.cloudinary.cloudName,
        api_key: this.config.cloudinary.apiKey,
        api_secret: this.config.cloudinary.apiSecret,
      });
      this.logger.log('Cloudinary storage initialized');
    }
  }

  async uploadFile(
    file: any,
    folder: string = 'uploads',
    allowedMimeTypes?: string[],
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }

    const maxSize = 20 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.originalname.split('.').pop();
    const fileName = `${folder}/${timestamp}-${randomString}.${extension}`;

    try {
      if (this.config.provider === 'aws') {
        return await this.uploadToS3(file, fileName);
      } else {
        return await this.uploadToCloudinary(file, folder);
      }
    } catch (error) {
      this.logger.error('File upload failed', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  private async uploadToS3(file: any, key: string): Promise<UploadResult> {
    if (!this.s3Client || !this.config.aws?.bucket) {
      throw new BadRequestException('AWS S3 not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.config.aws.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    const url = `https://${this.config.aws.bucket}.s3.${this.config.aws.region}.amazonaws.com/${key}`;

    return {
      url,
      key,
    };
  }

  private async uploadToCloudinary(file: any, folder: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error('Upload failed'));
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload an image from a public URL. Works with both Cloudinary and AWS S3.
   * @param imageUrl Public URL of the image to upload
   * @param folder Folder/prefix for the stored file (e.g. 'listings', 'next-uploads')
   */
  async uploadImageFromUrl(
    imageUrl: string,
    folder: string = 'listings',
  ): Promise<UploadFromUrlResult> {
    if (!imageUrl?.startsWith('http')) {
      throw new BadRequestException('Invalid image URL');
    }

    try {
      if (this.config.provider === 'aws') {
        return await this.uploadImageFromUrlToS3(imageUrl, folder);
      }
      return await this.uploadImageFromUrlToCloudinary(imageUrl, folder);
    } catch (error) {
      this.logger.error('Upload image from URL failed', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to upload image from URL',
      );
    }
  }

  private async uploadImageFromUrlToCloudinary(
    imageUrl: string,
    folder: string,
  ): Promise<UploadFromUrlResult> {
    if (!this.config.cloudinary?.cloudName) {
      throw new BadRequestException('Cloudinary not configured');
    }

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'fill' },
        { quality: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  private async uploadImageFromUrlToS3(
    imageUrl: string,
    folder: string,
  ): Promise<UploadFromUrlResult> {
    if (!this.s3Client || !this.config.aws?.bucket) {
      throw new BadRequestException('AWS S3 not configured');
    }

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024, // 10MB
      validateStatus: (status) => status === 200,
    });

    const buffer = Buffer.from(response.data);
    const contentType =
      response.headers['content-type']?.split(';')[0]?.trim() || 'image/jpeg';
    const ext = contentType.replace('image/', '') || 'jpg';
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 12)}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.config.aws.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    const url = `https://${this.config.aws.bucket}.s3.${this.config.aws.region}.amazonaws.com/${key}`;

    return {
      url,
      key,
      bytes: buffer.length,
    };
  }

  async deleteFile(url: string): Promise<boolean> {
    try {
      if (this.config.provider === 'aws') {
        return await this.deleteFromS3(url);
      } else {
        return await this.deleteFromCloudinary(url);
      }
    } catch (error) {
      this.logger.error('File deletion failed', error);
      return false;
    }
  }

  private async deleteFromS3(url: string): Promise<boolean> {
    if (!this.s3Client || !this.config.aws?.bucket) {
      return false;
    }

    try {
      const key = url.split('.com/')[1] || url.split('.amazonaws.com/')[1];
      if (!key) {
        return false;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.config.aws.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      this.logger.error('S3 delete failed', error);
      return false;
    }
  }

  private async deleteFromCloudinary(url: string): Promise<boolean> {
    try {
      const publicId = this.extractPublicIdFromUrl(url);
      if (!publicId) {
        return false;
      }

      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      this.logger.error('Cloudinary delete failed', error);
      return false;
    }
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return filename.split('.')[0] || null;
    } catch {
      return null;
    }
  }
}
