import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket/socketServer';

export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(userId: string, email: string): string {
    return jwt.sign(
      { id: userId, email },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  async signup(email: string, password: string, name: string, username: string): Promise<{ user: IUser; token: string }> {
    // Validate input
    if (!email || !password || !name || !username) {
      throw new AppError('Email, password, name, and username are required', 400);
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (username.length < 3) {
      throw new AppError('Username must be at least 3 characters long', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Check if username already taken
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      throw new AppError('Username already taken', 400);
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
      name,
      authProvider: 'local'
    });

    // Generate token
    const token = this.generateToken(user._id.toString(), user.email);

    // Emit socket event for new user
    try {
      const io = getIO();
      io.emit('user_registered', user);
    } catch (error) {
      console.warn('Could not emit user_registered event:', error);
    }

    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate token
    const token = this.generateToken(user._id.toString(), user.email);

    return { user, token };
  }

  async loginWithGoogle(googleId: string, email: string, name: string): Promise<{ user: IUser; token: string }> {
    // Find or create user
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if email already exists with local auth
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new AppError('Email already registered with password login', 400);
      }

      // Auto-generate username from email prefix
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create new user
      user = await User.create({
        email: email.toLowerCase(),
        username,
        name,
        authProvider: 'google',
        googleId
      });

      // Emit socket event for new user
      try {
        const io = getIO();
        io.emit('user_registered', user);
      } catch (error) {
        console.warn('Could not emit user_registered event:', error);
      }
    }

    // Generate token
    const token = this.generateToken(user._id.toString(), user.email);

    return { user, token };
  }

  validateToken(token: string): { id: string; email: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { id: string; email: string };
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}

export const authService = new AuthService();
