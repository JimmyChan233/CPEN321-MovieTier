import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import mediaController from '../controllers/mediaController';

const router = Router();

// Upload media file (authenticated)
router.post('/upload', authenticate, upload.single('file'), (req, res) =>
  mediaController.uploadMedia(req, res)
);

// Delete media file (authenticated)
router.delete('/:fileUrl', authenticate, (req, res) =>
  mediaController.deleteMedia(req, res)
);

export default router;
