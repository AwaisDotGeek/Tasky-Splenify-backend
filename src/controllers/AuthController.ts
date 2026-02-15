import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name, username } = req.body;

      const { user, token } = await authService.signup(email, password, name, username);

      res.status(201).json({
        status: 'success',
        data: {
          user,
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const { user, token } = await authService.login(email, password);

      res.status(200).json({
        status: 'success',
        data: {
          user,
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // For now, logout is handled client-side by removing the token
      // In a production app, you might want to blacklist tokens
      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async googleCallback(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const userWithToken = req.user as { user: any; token: string };
      
      if (!userWithToken || !userWithToken.token) {
        throw new AppError('Google authentication failed', 401);
      }

      // Redirect to frontend with token in query params
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/success?token=${userWithToken.token}`);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
