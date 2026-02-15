import { MessageService } from '../MessageService';
import { Message } from '../../models/Message';
import { User } from '../../models/User';
import { AppError } from '../../middleware/errorHandler';
import mongoose from 'mongoose';

jest.mock('../../models/Message');
jest.mock('../../models/User');

describe('MessageService', () => {
  let messageService: MessageService;
  const validUserId1 = new mongoose.Types.ObjectId().toString();
  const validUserId2 = new mongoose.Types.ObjectId().toString();
  const validGroupId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    messageService = new MessageService();
    jest.clearAllMocks();
  });

  describe('sendDirectMessage', () => {
    it('should create and return a direct message', async () => {
      const mockMessage = {
        _id: 'msg123',
        senderId: validUserId1,
        recipientId: validUserId2,
        content: 'Hello',
        messageType: 'direct',
        populate: jest.fn().mockResolvedValue({
          _id: 'msg123',
          senderId: { _id: validUserId1, name: 'User 1' },
          recipientId: { _id: validUserId2, name: 'User 2' },
          content: 'Hello',
          messageType: 'direct'
        })
      };

      (Message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendDirectMessage(validUserId1, validUserId2, 'Hello');

      expect(Message.create).toHaveBeenCalledWith({
        senderId: expect.any(Object),
        recipientId: expect.any(Object),
        content: 'Hello',
        messageType: 'direct',
        isRead: false
      });
      expect(result).toBeDefined();
    });

    it('should throw error for empty content', async () => {
      await expect(messageService.sendDirectMessage(validUserId1, validUserId2, ''))
        .rejects
        .toThrow('Message content cannot be empty');
    });

    it('should trim whitespace from content', async () => {
      const mockMessage = {
        populate: jest.fn().mockResolvedValue({})
      };
      (Message.create as jest.Mock).mockResolvedValue(mockMessage);

      await messageService.sendDirectMessage(validUserId1, validUserId2, '  Hello  ');

      expect(Message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello'
        })
      );
    });
  });

  describe('sendGroupMessage', () => {
    it('should create and return a group message', async () => {
      const mockMessage = {
        _id: 'msg123',
        senderId: validUserId1,
        groupId: validGroupId,
        content: 'Hello group',
        messageType: 'group',
        populate: jest.fn().mockResolvedValue({})
      };

      (Message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendGroupMessage(validUserId1, validGroupId, 'Hello group');

      expect(Message.create).toHaveBeenCalledWith({
        senderId: expect.any(Object),
        groupId: expect.any(Object),
        content: 'Hello group',
        messageType: 'group',
        isRead: false
      });
      expect(result).toBeDefined();
    });

    it('should throw error for empty content', async () => {
      await expect(messageService.sendGroupMessage(validUserId1, validGroupId, '   '))
        .rejects
        .toThrow('Message content cannot be empty');
    });
  });

  describe('getDirectMessages', () => {
    it('should return paginated direct messages', async () => {
      const mockMessages = [
        { _id: 'msg1', content: 'Hello' },
        { _id: 'msg2', content: 'Hi' }
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockMessages)
      };

      (Message.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await messageService.getDirectMessages(validUserId1, validUserId2, 1, 50);

      expect(Message.find).toHaveBeenCalledWith({
        messageType: 'direct',
        $or: [
          { senderId: validUserId1, recipientId: validUserId2 },
          { senderId: validUserId2, recipientId: validUserId1 }
        ]
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual(mockMessages);
    });

    it('should handle pagination correctly', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([])
      };

      (Message.find as jest.Mock).mockReturnValue(mockQuery);

      await messageService.getDirectMessages(validUserId1, validUserId2, 3, 20);

      expect(mockQuery.skip).toHaveBeenCalledWith(40); // (3-1) * 20
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('getGroupMessages', () => {
    it('should return paginated group messages', async () => {
      const mockMessages = [
        { _id: 'msg1', content: 'Hello group' },
        { _id: 'msg2', content: 'Hi everyone' }
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockMessages)
      };

      (Message.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await messageService.getGroupMessages(validGroupId, 1, 50);

      expect(Message.find).toHaveBeenCalledWith({
        messageType: 'group',
        groupId: expect.any(Object)
      });
      expect(result).toEqual(mockMessages);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const mockUser = {
        conversationReadStatus: new Map(),
        save: jest.fn().mockResolvedValue({})
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await messageService.markAsRead('msg123', validUserId1);

      expect(User.findById).toHaveBeenCalledWith(validUserId1);
      expect(mockUser.conversationReadStatus.get('msg123')).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
