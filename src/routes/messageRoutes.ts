import { Router } from 'express';
import { messageController } from '../controllers/MessageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware as any);

router.get('/direct/:userId', messageController.getDirectMessages as any);
router.delete('/direct/:userId', messageController.clearDirectMessages as any);
router.get('/group/:groupId', messageController.getGroupMessages as any);
router.delete('/group/:groupId', messageController.clearGroupMessages as any);

export default router;
