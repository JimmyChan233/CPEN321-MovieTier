import * as Minio from 'minio';
import crypto from 'crypto';
import { logger } from '../utils/logger';

class MinioService {
  private client: Minio.Client;
  private bucketName: string;
  private isAvailable: boolean = false;

  constructor() {
    const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = parseInt(process.env.MINIO_PORT || '9000');
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'movietier';

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    // Initialize bucket asynchronously without blocking
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        logger.success(`MinIO bucket "${this.bucketName}" created`);

        // Set bucket policy to public-read for images
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.client.setBucketPolicy(this.bucketName, JSON.stringify(policy));
        logger.success(`MinIO bucket policy set to public-read`);
      } else {
        logger.info(`MinIO bucket "${this.bucketName}" already exists`);
      }
      this.isAvailable = true;
    } catch (error) {
      logger.warn('MinIO is not available. Profile picture uploads will not work until MinIO is started.');
      logger.warn('To start MinIO, run: docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"');
      this.isAvailable = false;
    }
  }

  /**
   * Upload a file to MinIO
   * @param fileBuffer - The file buffer to upload
   * @param originalName - Original filename (optional, for extension detection)
   * @param folder - Folder/prefix in the bucket (default: 'images')
   * @returns Public URL of the uploaded file
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName?: string,
    folder: string = 'images'
  ): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('MinIO is not available. Please ensure MinIO server is running.');
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const extension = originalName ? this.getExtension(originalName) : 'jpg';
      const filename = `${folder}/${timestamp}_${randomString}.${extension}`;

      // Determine content type
      const contentType = this.getContentType(extension);

      // Upload to MinIO
      await this.client.putObject(this.bucketName, filename, fileBuffer, fileBuffer.length, {
        'Content-Type': contentType,
      });

      // Generate public URL
      const publicUrl = this.getPublicUrl(filename);
      logger.info(`File uploaded to MinIO: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      logger.error('MinIO upload error:', error);
      throw new Error('Failed to upload file to MinIO');
    }
  }

  /**
   * Delete a file from MinIO
   * @param fileUrl - The public URL or object name to delete
   * @returns True if deletion was successful
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract object name from URL
      const objectName = this.extractObjectName(fileUrl);
      if (!objectName) {
        logger.warn('Could not extract object name from URL:', fileUrl);
        return false;
      }

      await this.client.removeObject(this.bucketName, objectName);
      logger.info(`File deleted from MinIO: ${objectName}`);
      return true;
    } catch (error) {
      logger.error('MinIO delete error:', error);
      return false;
    }
  }

  /**
   * Check if a URL is a MinIO URL
   * @param url - The URL to check
   * @returns True if the URL is a MinIO URL
   */
  isMinioUrl(url: string): boolean {
    const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
    return url.includes(minioEndpoint) || url.includes(this.bucketName);
  }

  /**
   * Get the public URL for an object
   * @param objectName - The object name in the bucket
   * @returns Public URL
   */
  private getPublicUrl(objectName: string): string {
    const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const protocol = useSSL ? 'https' : 'http';
    const portSuffix = (useSSL && port === '443') || (!useSSL && port === '80') ? '' : `:${port}`;

    return `${protocol}://${endPoint}${portSuffix}/${this.bucketName}/${objectName}`;
  }

  /**
   * Extract object name from MinIO URL
   * @param url - The full URL
   * @returns Object name or null
   */
  private extractObjectName(url: string): string | null {
    try {
      // Format: http(s)://endpoint:port/bucket/object/name
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // Remove bucket name from path
      if (pathParts[0] === this.bucketName) {
        pathParts.shift();
      }

      return pathParts.join('/');
    } catch {
      // If URL parsing fails, try simple string extraction
      const match = url.match(new RegExp(`${this.bucketName}/(.+)$`));
      return match ? match[1] : null;
    }
  }

  /**
   * Get file extension from filename
   * @param filename - The filename
   * @returns Extension without dot
   */
  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
  }

  /**
   * Get content type from extension
   * @param extension - File extension
   * @returns MIME type
   */
  private getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return contentTypes[extension] || 'application/octet-stream';
  }
}

export default new MinioService();
