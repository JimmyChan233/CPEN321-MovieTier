import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  res.json({ success: true, message: 'Recommendations route - placeholder', data: [] });
});

export default router;
