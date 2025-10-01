import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:userId', authenticate, async (req, res) => {
  res.json({ success: true, message: 'User route - placeholder', data: null });
});

export default router;
