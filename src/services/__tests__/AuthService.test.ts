import { AuthService } from '../AuthService';
import { User } from '../../models/User';
import { AppError } from '../../middleware/errorHandler';
import bcrypt from 'bcrypt';

jest.mock('../../models/User');
jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testpassword123';
      const hashedPassword = 'hashed_password';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await authService.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testpassword123';
      const hash = 'hashed_password';
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.comparePassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'wrongpassword';
      const hash = 'hashed_password';
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.comparePassword(password, hash);

      expect(result).toBe(false);
    });
  });

  describe('signup', () => {
    it('should create a new user with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'Test User';
      const username = 'testuser';
      const hashedPassword = 'hashed_password';
      const mockUser = {
        _id: 'user123',
        email,
        username,
        name,
        authProvider: 'local'
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (User.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.signup(email, password, name, username);

      expect(User.findOne).toHaveBeenCalledWith({ email: email.toLowerCase() });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(User.create).toHaveBeenCalledWith({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash: hashedPassword,
        name,
        authProvider: 'local'
      });
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';
      const name = 'Test User';

      (User.findOne as jest.Mock).mockResolvedValue({ email });

      await expect(authService.signup(email, password, name, 'existinguser'))
        .rejects
        .toThrow(AppError);
    });

    it('should throw error if password is too short', async () => {
      const email = 'test@example.com';
      const password = 'short';
      const name = 'Test User';

      await expect(authService.signup(email, password, name, 'testuser'))
        .rejects
        .toThrow('Password must be at least 8 characters long');
    });

    it('should throw error if required fields are missing', async () => {
      await expect(authService.signup('', 'password123', 'Test', 'testuser'))
        .rejects
        .toThrow('Email, password, name, and username are required');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = {
        _id: 'user123',
        email,
        passwordHash: 'hashed_password'
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(email, password);

      expect(User.findOne).toHaveBeenCalledWith({ email: email.toLowerCase() });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.passwordHash);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(email, password))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should throw error with invalid password', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const mockUser = {
        _id: 'user123',
        email,
        passwordHash: 'hashed_password'
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(email, password))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should throw error if required fields are missing', async () => {
      await expect(authService.login('', 'password'))
        .rejects
        .toThrow('Email and password are required');
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user123';
      const email = 'test@example.com';

      const token = authService.generateToken(userId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', () => {
      const userId = 'user123';
      const email = 'test@example.com';
      const token = authService.generateToken(userId, email);

      const decoded = authService.validateToken(token);

      expect(decoded.id).toBe(userId);
      expect(decoded.email).toBe(email);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => authService.validateToken(invalidToken))
        .toThrow(AppError);
    });
  });
});
