import { User, IUser } from '../models/User';
import { AppError } from '../middleware/errorHandler';

export class UserService {
  async getAllUsers(excludeUserId: string): Promise<IUser[]> {
    const users = await User.find({
      _id: { $ne: excludeUserId }
    }).select('-passwordHash');

    return users;
  }

  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select('-passwordHash');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async updateUser(userId: string, updates: Partial<IUser>): Promise<IUser> {
    // Prevent updating sensitive fields
    delete (updates as any).passwordHash;
    delete (updates as any).email;
    delete (updates as any).authProvider;
    delete (updates as any).googleId;

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date()
    });
  }
}

export const userService = new UserService();
