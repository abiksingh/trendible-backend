import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { User } from '@prisma/client';
import { ProcessedResponse } from './responseFormatter';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { AuthenticatedRequest } from '../types/auth.types';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const processedRes = res as ProcessedResponse;
  
  passport.authenticate('jwt', { session: false }, (err: any, user: User | false, info: any) => {
    if (err) {
      logError('JWT authentication middleware error', err);
      return processedRes.apiInternalError('Authentication error');
    }
    
    if (!user) {
      logInfo('JWT authentication failed', { reason: info?.message || 'Invalid token' });
      return processedRes.apiUnauthorized(info?.message || 'Authentication required');
    }
    
    (req as AuthenticatedRequest).user = user;
    logInfo('JWT authentication successful', { userId: user.id, email: user.email });
    next();
  })(req, res, next);
};

export const optionalAuthenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logInfo('No authorization header provided, proceeding without authentication');
    return next();
  }
  
  passport.authenticate('jwt', { session: false }, (err: any, user: User | false, info: any) => {
    if (err) {
      logError('Optional JWT authentication middleware error', err);
      return next();
    }
    
    if (user) {
      (req as AuthenticatedRequest).user = user;
      logInfo('Optional JWT authentication successful', { userId: user.id, email: user.email });
    } else {
      logInfo('Optional JWT authentication failed, proceeding without user', { reason: info?.message });
    }
    
    next();
  })(req, res, next);
};

export const authenticateLocal = (req: Request, res: Response, next: NextFunction) => {
  const processedRes = res as ProcessedResponse;
  
  passport.authenticate('local', { session: false }, (err: any, user: User | false, info: any) => {
    if (err) {
      logError('Local authentication middleware error', err);
      return processedRes.apiInternalError('Authentication error');
    }
    
    if (!user) {
      logInfo('Local authentication failed', { reason: info?.message || 'Invalid credentials' });
      return processedRes.apiUnauthorized(info?.message || 'Invalid email or password');
    }
    
    (req as AuthenticatedRequest).user = user;
    logInfo('Local authentication successful', { userId: user.id, email: user.email });
    next();
  })(req, res, next);
};