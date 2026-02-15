import { Group, IGroup } from '../models/Group';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

export class GroupService {
  async createGroup(
    name: string,
    creatorId: string,
    memberIds: string[]
  ): Promise<IGroup> {
    // Validate name
    if (!name || name.trim().length === 0) {
      throw new AppError('Group name is required', 400);
    }

    if (name.length > 100) {
      throw new AppError('Group name must not exceed 100 characters', 400);
    }

    // Ensure creator is in members list
    const allMemberIds = [...new Set([creatorId, ...memberIds])];

    // Validate member count
    if (allMemberIds.length < 2) {
      throw new AppError('Group must have at least 2 members', 400);
    }

    if (allMemberIds.length > 50) {
      throw new AppError('Group cannot have more than 50 members', 400);
    }

    const group = await Group.create({
      name: name.trim(),
      creatorId: new mongoose.Types.ObjectId(creatorId),
      memberIds: allMemberIds.map(id => new mongoose.Types.ObjectId(id))
    });

    return group.populate('memberIds');
  }

  async getGroup(groupId: string): Promise<IGroup> {
    const group = await Group.findById(groupId).populate('memberIds');

    if (!group) {
      throw new AppError('Group not found', 404);
    }

    return group;
  }

  async getUserGroups(userId: string): Promise<IGroup[]> {
    const groups = await Group.find({
      memberIds: new mongoose.Types.ObjectId(userId)
    }).populate('memberIds');

    return groups;
  }

  async addMembers(groupId: string, memberIds: string[]): Promise<IGroup> {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new AppError('Group not found', 404);
    }

    // Add new members (avoid duplicates)
    const newMemberIds = memberIds
      .map(id => new mongoose.Types.ObjectId(id))
      .filter(id => !group.memberIds.some(memberId => memberId.equals(id)));

    group.memberIds.push(...newMemberIds);

    // Validate member count
    if (group.memberIds.length > 50) {
      throw new AppError('Group cannot have more than 50 members', 400);
    }

    await group.save();
    return group.populate('memberIds');
  }

  async removeMember(groupId: string, memberId: string): Promise<IGroup> {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new AppError('Group not found', 404);
    }

    group.memberIds = group.memberIds.filter(
      id => !id.equals(new mongoose.Types.ObjectId(memberId))
    );

    // Validate minimum member count
    if (group.memberIds.length < 2) {
      throw new AppError('Group must have at least 2 members', 400);
    }

    await group.save();
    return group.populate('memberIds');
  }

  async validateMembership(groupId: string, userId: string): Promise<boolean> {
    const group = await Group.findById(groupId);

    if (!group) {
      return false;
    }

    return group.memberIds.some(id => id.equals(new mongoose.Types.ObjectId(userId)));
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new AppError('Group not found', 404);
    }

    if (!group.creatorId.equals(new mongoose.Types.ObjectId(userId))) {
      throw new AppError('Only the creator can delete the group', 403);
    }

    await Group.findByIdAndDelete(groupId);
    
    // Cleanup messages
    const { messageService } = await import('./MessageService');
    await messageService.clearGroupMessages(groupId);
  }
}

export const groupService = new GroupService();
