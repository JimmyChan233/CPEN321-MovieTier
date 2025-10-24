import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import minioService from '../services/minio.service';
import { logger } from '../utils/logger';

export class MediaController {
  /**
   * Upload media file (image) to MinIO
   * POST /api/media/upload
   */
  async uploadMedia(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        logger.warn('Media upload failed: no file provided');
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      logger.info(`Uploading media file for user ${req.userId}`);

      // Upload to MinIO
      const imageUrl = await minioService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        'images'
      );

      logger.success(`Media uploaded successfully: ${imageUrl}`);
      return res.json({
        success: true,
        data: {
          url: imageUrl,
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      logger.error('Media upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to upload file. Please try again',
      });
    }
  }

  /**
   * Delete media file from MinIO
   * DELETE /api/media/:fileUrl
   */
  async deleteMedia(req: AuthRequest, res: Response) {
    try {
      const { fileUrl } = req.params;

      if (!fileUrl) {
        return res.status(400).json({ success: false, message: 'File URL is required' });
      }

      logger.info(`Deleting media file: ${fileUrl}`);

      const deleted = await minioService.deleteFile(decodeURIComponent(fileUrl));

      if (deleted) {
        logger.success('Media deleted successfully');
        return res.json({ success: true, message: 'File deleted successfully' });
      } else {
        return res.status(404).json({ success: false, message: 'File not found or already deleted' });
      }
    } catch (error) {
      logger.error('Media delete error:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to delete file. Please try again',
      });
    }
  }
}

export default new MediaController();
