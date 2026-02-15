import { UserService } from '../UserService';
import { User } from '../../models/User';
import { AppError } from '../../middleware/errorHandler';

jest.mock('../../models/User');

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users except the excluded one', async () => {
      const mockUsers = [
        { _id: 'user2', name: 'User 2', email: 'user2@test.com' },
        { _id: 'user3', name: 'User 3', email: 'user3@test.com' }
      ];

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUsers)
      };

      (User.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await userService.getAllUsers('user1');

      expect(User.find).toHaveBeenCalledWith({
        _id: { $ne: 'user1' }
      });
      expect(mockQuery.select).toHaveBeenCalledWith('-passwordHash');
      expect(result).toEqual(mockUsers);
    });

    it('should exclude password hashes from results', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue([])
      };

      (User.find as jest.Mock).mockReturnValue(mockQuery);

      await userService.getAllUsers('user1');

      expect(mockQuery.select).toHaveBeenCalledWith('-passwordHash');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        _id: 'user1',
        name: 'User 1',
        email: 'user1@test.com'
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };

      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      const result = await userService.getUserById('user1');

      expect(User.findById).toHaveBeenCalledWith('user1');
      expect(mockQuery.select).toHaveBeenCalledWith('-passwordHash');
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null)
      };

      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      await expect(userService.getUserById('nonexistent'))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('should update user with valid fields', async () => {
      const mockUser = {
        _id: 'user1',
        name: 'Updated Name',
        email: 'user1@test.com'
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };

      (User.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      const result = await userService.updateUser('user1', { name: 'Updated Name' });

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        { name: 'Updated Name' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUser);
    });

    it('should prevent updating sensitive fields', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue({})
      };

      (User.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      await userService.updateUser('user1', {
        name: 'New Name',
        passwordHash: 'hacked',
        email: 'hacked@test.com',
        authProvider: 'google',
        googleId: 'hacked'
      } as any);

      const updateCall = (User.findByIdAndUpdate as jest.Mock).mock.calls[0][1];
      expect(updateCall).toEqual({ name: 'New Name' });
      expect(updateCall.passwordHash).toBeUndefined();
      expect(updateCall.email).toBeUndefined();
      expect(updateCall.authProvider).toBeUndefined();
      expect(updateCall.googleId).toBeUndefined();
    });

    it('should throw error if user not found', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null)
      };

      (User.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      await expect(userService.updateUser('nonexistent', { name: 'Test' }))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('setOnlineStatus', () => {
    it('should update user online status to true', async () => {
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await userService.setOnlineStatus('user1', true);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', {
        isOnline: true,
        lastSeen: expect.any(Date)
      });
    });

    it('should update user online status to false', async () => {
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await userService.setOnlineStatus('user1', false);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', {
        isOnline: false,
        lastSeen: expect.any(Date)
      });
    });

    it('should update lastSeen timestamp', async () => {
      const beforeTime = new Date();
      
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await userService.setOnlineStatus('user1', true);

      const updateCall = (User.findByIdAndUpdate as jest.Mock).mock.calls[0][1];
      const afterTime = new Date();
      
      expect(updateCall.lastSeen).toBeInstanceOf(Date);
      expect(updateCall.lastSeen.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(updateCall.lastSeen.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
