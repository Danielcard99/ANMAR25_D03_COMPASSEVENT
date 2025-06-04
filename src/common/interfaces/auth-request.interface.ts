import { Request } from 'express';

export interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: 'organizer' | 'participant' | 'admin';
    emailConfirmed: boolean;
  };
}
