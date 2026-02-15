import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { UserController } from '../UserController';
import { userService } from '../../services/UserService';

jest.mock('../../services/UserService');

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    userController = new UserController();
    mockRequest = {
      user: { id: 'user123', email: 'test@example.com' },
      params: {},
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users except current user', async () => {
      const mockUsers = [
        { id: 'user456', name: 'User 1', email: 'user1@example.com' },
        { id: 'user789', name: 'User 2', email: 'user2@example.com' }
      ];

      (userService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

      await userController.getAllUsers(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(userService.getAllUsers).toHaveBeenCalledWith('user123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { users: mockUsers }
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Failed to fetch users');
      (userService.getAllUsers as jest.Mock).mockRejectedValue(error);

      await userController.getAllUsers(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      mockRequest.params = { id: 'user456' };
      const mockUser = { id: 'user456', name: 'User 1', email: 'user1@example.com' };

      (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await userController.getUserById(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(userService.getUserById).toHaveBeenCalledWith('user456');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: mockUser }
      });
    });

    it('should call next with error on failure', async () => {
      mockRequest.params = { id: 'user456' };
      const error = new Error('User not found');
      (userService.getUserById as jest.Mock).mockRejectedValue(error);

      await userController.getUserById(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      mockRequest.params = { id: 'user123' };
      mockRequest.body = { name: 'Updated Name', bio: 'New bio' };

      const mockUser = {
        id: 'user123',
        name: 'Updated Name',
        bio: 'New bio',
        email: 'test@example.com'
      };

      (userService.updateUser as jest.Mock).mockResolvedValue(mockUser);

      await userController.updateUser(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(userService.updateUser).toHaveBeenCalledWith(
        'user123',
        { name: 'Updated Name', bio: 'New bio' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: mockUser }
      });
    });

    it('should call next with error on failure', async () => {
      mockRequest.params = { id: 'user123' };
      const error = new Error('Failed to update user');
      (userService.updateUser as jest.Mock).mockRejectedValue(error);

      await userController.updateUser(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
