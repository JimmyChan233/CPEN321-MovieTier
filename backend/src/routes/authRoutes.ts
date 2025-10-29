import { Router } from 'express';
import * as authController from '../controllers/auth/authController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/signin', asyncHandler(authController.signIn));
router.post('/signup', asyncHandler(authController.signUp));
router.post('/signout', authenticate, authController.signOut);
router.delete('/account', authenticate, asyncHandler(authController.deleteAccount));

export default router;
