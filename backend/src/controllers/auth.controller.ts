import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Demo login support or email validation
      const user = {
        id: 'user_reachinbox_evaluator',
        email: email || 'evaluator@reachinbox.ai',
        name: email ? email.split('@')[0] : 'Lead Evaluator',
      };

      const token = jwt.sign(user, config.jwtSecret, { expiresIn: '7d' });

      res.json({
        success: true,
        message: 'Logged in successfully',
        data: {
          token,
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, config.jwtSecret);

      res.json({
        success: true,
        data: decoded,
      });
    } catch (error) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  }
}
