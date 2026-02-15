import { Message, IMessage } from '../models/Message';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

export class MessageService {
  async sendDirectMessage(
    senderId: string,
    recipientId: string,
    content: string
  ): Promise<IMessage> {
    if (!content || content.trim().length === 0) {
      throw new AppError('Message content cannot be empty', 400);
    }

    const message = await Message.create({
      senderId: new mongoose.Types.ObjectId(senderId),
      recipientId: new mongoose.Types.ObjectId(recipientId),
      content: content.trim(),
      messageType: 'direct',
      isRead: false
    });

    return message.populate(['senderId', 'recipientId']);
  }

  async sendGroupMessage(
    senderId: string,
    groupId: string,
    content: string
  ): Promise<IMessage> {
    if (!content || content.trim().length === 0) {
      throw new AppError('Message content cannot be empty', 400);
    }

    const message = await Message.create({
      senderId: new mongoose.Types.ObjectId(senderId),
      groupId: new mongoose.Types.ObjectId(groupId),
      content: content.trim(),
      messageType: 'group',
      isRead: false
    });

    return message.populate(['senderId', 'groupId']);
  }

  async getDirectMessages(
    user1Id: string,
    user2Id: string,
    page: number = 1,
    limit: number = 50
  ): Promise<IMessage[]> {
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      messageType: 'direct',
      $or: [
        { senderId: user1Id, recipientId: user2Id },
        { senderId: user2Id, recipientId: user1Id }
      ]
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate(['senderId', 'recipientId']);

    return messages;
  }

  async getGroupMessages(
    groupId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<IMessage[]> {
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      messageType: 'group',
      groupId: new mongoose.Types.ObjectId(groupId)
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate(['senderId', 'groupId']);

    return messages;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (user) {
      if (!user.conversationReadStatus) {
        user.conversationReadStatus = new Map();
      }
      user.conversationReadStatus.set(conversationId, new Date());
      await user.save();
    }
  }

  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const user = await User.findById(userId);
    if (!user) return {};

    const readStatus = user.conversationReadStatus || new Map();
    const unreadCounts: Record<string, number> = {};

    // Get all direct messages where the user is recipient and either first message or after lastReadAt
    const directMessages = await Message.aggregate([
      {
        $match: {
          recipientId: new mongoose.Types.ObjectId(userId),
          messageType: 'direct'
        }
      },
      {
        $group: {
          _id: '$senderId',
          messages: { $push: { createdAt: '$createdAt' } }
        }
      }
    ]);

    for (const group of directMessages) {
      const senderId = group._id.toString();
      const lastRead = readStatus.get(senderId) || new Date(0);
      const count = group.messages.filter((m: any) => m.createdAt > lastRead).length;
      if (count > 0) unreadCounts[senderId] = count;
    }

    // Similar for group messages
    // First get all groups the user is member of
    const userGroups = await mongoose.model('Group').find({ memberIds: userId });
    for (const group of userGroups) {
      const gId = group._id.toString();
      const lastRead = readStatus.get(gId) || new Date(0);
      const count = await Message.countDocuments({
        groupId: group._id,
        messageType: 'group',
        senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        createdAt: { $gt: lastRead }
      });
      if (count > 0) unreadCounts[gId] = count;
    }

    return unreadCounts;
  }

  async clearDirectMessages(user1Id: string, user2Id: string): Promise<void> {
    await Message.deleteMany({
      messageType: 'direct',
      $or: [
        { senderId: user1Id, recipientId: user2Id },
        { senderId: user2Id, recipientId: user1Id }
      ]
    });
  }

  async clearGroupMessages(groupId: string): Promise<void> {
    await Message.deleteMany({
      messageType: 'group',
      groupId: new mongoose.Types.ObjectId(groupId)
    });
  }
}

export const messageService = new MessageService();
