import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { messageService } from '../services/MessageService';

export class MessageController {
  async getDirectMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await messageService.getDirectMessages(
        req.user!.id,
        userId,
        page,
        limit
      );

      res.status(200).json({
        status: 'success',
        data: { messages }
      });
    } catch (error) {
      next(error);
    }
  }

  async getGroupMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await messageService.getGroupMessages(groupId, page, limit);

      res.status(200).json({
        status: 'success',
        data: { messages }
      });
    } catch (error) {
      next(error);
    }
  }

  async clearDirectMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      await messageService.clearDirectMessages(req.user!.id, userId);

      res.status(200).json({
        status: 'success',
        message: 'Direct chat cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async clearGroupMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      await messageService.clearGroupMessages(groupId);

      res.status(200).json({
        status: 'success',
        message: 'Group chat cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
