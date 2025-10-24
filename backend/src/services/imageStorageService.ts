import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class ImageStorageService {
  private static uploadsDir = path.join(__dirname, '../../uploads/profile-pictures');

  /**
   * Initialize the uploads directory
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
      throw error;
    }
  }

  /**
   * Save an image to local storage
   * @param fileBuffer - The image file buffer
   * @param userId - The user ID (for organizing files)
   * @returns The URL path to access the image
   */
  static async saveImage(fileBuffer: Buffer, userId: string): Promise<string> {
    try {
      // Ensure uploads directory exists
      await this.initialize();

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const filename = `${userId}_${timestamp}_${randomString}.jpg`;
      const filePath = path.join(this.uploadsDir, filename);

      // Process image: resize, optimize, and convert to JPEG
      await sharp(fileBuffer)
        .resize(512, 512, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toFile(filePath);

      // Return URL path (relative to server)
      return `/uploads/profile-pictures/${filename}`;
    } catch (error) {
      console.error('Error saving image:', error);
      throw new Error('Failed to save image');
    }
  }

  /**
   * Delete an image from local storage
   * @param imageUrl - The URL path of the image to delete
   * @returns True if deletion was successful
   */
  static async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract filename from URL path
      // URL format: /uploads/profile-pictures/filename.jpg
      const filename = path.basename(imageUrl);
      const filePath = path.join(this.uploadsDir, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, consider it already deleted
        return true;
      }

      // Delete the file
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Check if a URL is a local storage URL
   * @param url - The URL to check
   * @returns True if the URL is a local storage URL
   */
  static isLocalStorageUrl(url: string): boolean {
    return url.startsWith('/uploads/profile-pictures/');
  }
}
