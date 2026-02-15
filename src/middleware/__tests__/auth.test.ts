import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../auth';
import { AppError } from '../errorHandler';

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {};
    mockNext = jest.fn();
    
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should attach user to request with valid token', async () => {
    const token = jwt.sign(
      { id: 'user123', email: 'test@example.com' },
      'test-secret'
    );
    
    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

    expect(mockRequest.user).toEqual({
      id: 'user123',
      email: 'test@example.com'
    });
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should throw error when no authorization header', async () => {
    mockRequest.headers = {};

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = (mockNext as jest.Mock).mock.calls[0][0];
    expect(error.message).toBe('No token provided');
    expect(error.statusCode).toBe(401);
  });

  it('should throw error when authorization header does not start with Bearer', async () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token123'
    };

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = (mockNext as jest.Mock).mock.calls[0][0];
    expect(error.message).toBe('No token provided');
    expect(error.statusCode).toBe(401);
  });

  it('should throw error with invalid token', async () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token'
    };

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = (mockNext as jest.Mock).mock.calls[0][0];
    expect(error.message).toBe('Invalid token');
    expect(error.statusCode).toBe(401);
  });

  it('should throw error with expired token', async () => {
    const expiredToken = jwt.sign(
      { id: 'user123', email: 'test@example.com' },
      'test-secret',
      { expiresIn: '0s' } // Expire immediately
    );
    
    // Wait a moment to ensure token is expired
    await new Promise(resolve => setTimeout(resolve, 100));
    
    mockRequest.headers = {
      authorization: `Bearer ${expiredToken}`
    };

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = (mockNext as jest.Mock).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    // Token can be either expired or invalid depending on timing
    expect(['Token expired', 'Invalid token']).toContain(error.message);
  });

  it('should use default secret if JWT_SECRET not set', async () => {
    delete process.env.JWT_SECRET;
    
    const token = jwt.sign(
      { id: 'user123', email: 'test@example.com' },
      'default-secret'
    );
    
    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

    expect(mockRequest.user).toEqual({
      id: 'user123',
      email: 'test@example.com'
    });
    expect(mockNext).toHaveBeenCalledWith();
  });
});
