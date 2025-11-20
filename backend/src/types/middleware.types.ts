import { Request } from 'express';

/**
 * Authenticated request interface with userId
 */
export interface AuthRequest extends Request {
  userId?: string;
}