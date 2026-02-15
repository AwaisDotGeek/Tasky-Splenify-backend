import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../AuthController';
import { authService } from '../../services/AuthService';

jest.mock('../../services/AuthService');

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    authController = new AuthController();
    mockRequest = {
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create user and return token', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        username: 'testuser'
      };

      const mockResult = {
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'jwt-token'
      };

      (authService.signup as jest.Mock).mockResolvedValue(mockResult);

      await authController.signup(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authService.signup).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User',
        'testuser'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockResult
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Signup failed');
      (authService.signup as jest.Mock).mockRejectedValue(error);

      await authController.signup(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login user and return token', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResult = {
        user: { id: '123', email: 'test@example.com' },
        token: 'jwt-token'
      };

      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockResult
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Login failed');
      (authService.login as jest.Mock).mockRejectedValue(error);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      await authController.logout(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully'
      });
    });
  });

  describe('googleCallback', () => {
    it('should redirect to frontend with token', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockToken = 'jwt-token';
      
      (mockRequest as any).user = { user: mockUser, token: mockToken };
      mockResponse.redirect = jest.fn();

      await authController.googleCallback(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `${frontendUrl}/auth/success?token=${mockToken}`
      );
    });

    it('should throw error if user/token is missing', async () => {
      (mockRequest as any).user = null;

      await authController.googleCallback(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Google authentication failed');
    });
  });
});
