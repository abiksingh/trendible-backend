import { User } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}