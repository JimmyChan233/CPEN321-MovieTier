import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getRecommendations } from '../controllers/recomendations/movieRecommendationController';


const router = Router();

// router.get('/', authenticate, async (req, res) => {
//   res.json({ success: true, message: 'Recommendations route - placeholder', data: [] });
// });

// ✅ Get personalized movie recommendations
router.get('/', authenticate, getRecommendations);


export default router;
