import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { MessageController } from '../MessageController';
import { messageService } from '../../services/MessageService';

jest.mock('../../services/MessageService');

describe('MessageController', () => {
  let messageController: MessageController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    messageController = new MessageController();
    mockRequest = {
      user: { id: 'user123', email: 'test@example.com' },
      params: {},
      query: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getDirectMessages', () => {
    it('should return direct messages with default pagination', async () => {
      mockRequest.params = { userId: 'user456' };
      const mockMessages = [
        { id: 'msg1', content: 'Hello' },
        { id: 'msg2', content: 'Hi' }
      ];

      (messageService.getDirectMessages as jest.Mock).mockResolvedValue(mockMessages);

      await messageController.getDirectMessages(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(messageService.getDirectMessages).toHaveBeenCalledWith(
        'user123',
        'user456',
        1,
        50
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { messages: mockMessages }
      });
    });

    it('should handle custom pagination', async () => {
      mockRequest.params = { userId: 'user456' };
      mockRequest.query = { page: '2', limit: '20' };

      (messageService.getDirectMessages as jest.Mock).mockResolvedValue([]);

      await messageController.getDirectMessages(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(messageService.getDirectMessages).toHaveBeenCalledWith(
        'user123',
        'user456',
        2,
        20
      );
    });

    it('should call next with error on failure', async () => {
      mockRequest.params = { userId: 'user456' };
      const error = new Error('Failed to fetch messages');
      (messageService.getDirectMessages as jest.Mock).mockRejectedValue(error);

      await messageController.getDirectMessages(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getGroupMessages', () => {
    it('should return group messages with default pagination', async () => {
      mockRequest.params = { groupId: 'group123' };
      const mockMessages = [
        { id: 'msg1', content: 'Hello group' }
      ];

      (messageService.getGroupMessages as jest.Mock).mockResolvedValue(mockMessages);

      await messageController.getGroupMessages(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(messageService.getGroupMessages).toHaveBeenCalledWith(
        'group123',
        1,
        50
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { messages: mockMessages }
      });
    });

    it('should handle custom pagination', async () => {
      mockRequest.params = { groupId: 'group123' };
      mockRequest.query = { page: '3', limit: '10' };

      (messageService.getGroupMessages as jest.Mock).mockResolvedValue([]);

      await messageController.getGroupMessages(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(messageService.getGroupMessages).toHaveBeenCalledWith(
        'group123',
        3,
        10
      );
    });

    it('should call next with error on failure', async () => {
      mockRequest.params = { groupId: 'group123' };
      const error = new Error('Failed to fetch group messages');
      (messageService.getGroupMessages as jest.Mock).mockRejectedValue(error);

      await messageController.getGroupMessages(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
