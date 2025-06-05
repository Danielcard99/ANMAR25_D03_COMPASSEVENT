import { Request } from 'express';

export interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: 'participant' | 'organizer' | 'admin';
    emailConfirmed: boolean;
  };
}