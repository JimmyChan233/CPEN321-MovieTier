import { Router } from 'express';
import * as authController from '../controllers/auth/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/signin', authController.signIn);
router.post('/signup', authController.signUp);
router.post('/signout', authenticate, authController.signOut);
router.delete('/account', authenticate, authController.deleteAccount);

export default router;
