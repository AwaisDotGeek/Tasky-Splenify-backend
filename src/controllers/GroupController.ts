import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { groupService } from '../services/GroupService';
import { messageService } from '../services/MessageService';
import { getIO } from '../socket/socketServer';

export class GroupController {
  async createGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, memberIds } = req.body;

      const group = await groupService.createGroup(name, req.user!.id, memberIds || []);

      res.status(201).json({
        status: 'success',
        data: { group }
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserGroups(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const groups = await groupService.getUserGroups(req.user!.id);
      const unreadCounts = await messageService.getUnreadCounts(req.user!.id);

      const groupsWithUnread = groups.map(group => ({
        ...group.toJSON(),
        unreadCount: unreadCounts[group._id.toString()] || 0
      }));

      res.status(200).json({
        status: 'success',
        data: { groups: groupsWithUnread }
      });
    } catch (error) {
      next(error);
    }
  }

  async getGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const group = await groupService.getGroup(id);

      res.status(200).json({
        status: 'success',
        data: { group }
      });
    } catch (error) {
      next(error);
    }
  }

  async addMembers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { memberIds } = req.body;

      const group = await groupService.addMembers(id, memberIds);

      res.status(200).json({
        status: 'success',
        data: { group }
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, userId } = req.params;

      const group = await groupService.removeMember(id, userId);

      res.status(200).json({
        status: 'success',
        data: { group }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const group = await groupService.getGroup(id);
      const memberIds = group.memberIds.map(m => (m as any)._id || m).map(id => id.toString());

      await groupService.deleteGroup(id, req.user!.id);

      // Emit socket event to all members
      try {
        const io = getIO();
        memberIds.forEach(memberId => {
          io.to(memberId).emit('group_deleted', { groupId: id });
        });
      } catch (error) {
        console.warn('Could not emit group_deleted event:', error);
      }

      res.status(200).json({
        status: 'success',
        message: 'Group deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const groupController = new GroupController();
