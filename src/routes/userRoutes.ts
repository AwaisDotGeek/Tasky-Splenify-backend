import { Router } from 'express';
import { userController } from '../controllers/UserController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware as any);

router.get('/me', userController.getMe as any);
router.get('/', userController.getAllUsers as any);
router.get('/:id', userController.getUserById as any);
router.patch('/:id', userController.updateUser as any);

export default router;
