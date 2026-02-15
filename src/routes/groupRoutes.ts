import { Router } from 'express';
import { groupController } from '../controllers/GroupController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware as any);

router.post('/', groupController.createGroup as any);
router.get('/', groupController.getUserGroups as any);
router.get('/:id', groupController.getGroup as any);
router.delete('/:id', groupController.deleteGroup as any);
router.post('/:id/members', groupController.addMembers as any);
router.delete('/:id/members/:userId', groupController.removeMember as any);

export default router;
