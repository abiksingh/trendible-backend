import * as jwt from 'jsonwebtoken';
import { authConfig } from '../config/authConfig';
import { logInfo, logError } from './dataForSEOLogger';

export interface JwtPayload {
  userId: number;
  email: string;
  type: 'access' | 'refresh';
}

export const jwtUtils = {
  generateAccessToken(userId: number, email: string): string {
    try {
      logInfo('Generating access token', { userId });
      
      const payload: JwtPayload = {
        userId,
        email,
        type: 'access'
      };
      
      const token = (jwt as any).sign(
        payload, 
        authConfig.jwt.secret, 
        {
          expiresIn: authConfig.jwt.accessTokenExpiry,
          issuer: 'trendible-backend',
          audience: 'trendible-frontend'
        }
      ) as string;
      
      logInfo('Access token generated successfully', { userId });
      return token;
    } catch (error) {
      logError('Failed to generate access token', error);
      throw new Error('Token generation failed');
    }
  },

  generateRefreshToken(userId: number, email: string): string {
    try {
      logInfo('Generating refresh token', { userId });
      
      const payload: JwtPayload = {
        userId,
        email,
        type: 'refresh'
      };
      
      const token = (jwt as any).sign(
        payload, 
        authConfig.jwt.secret, 
        {
          expiresIn: authConfig.jwt.refreshTokenExpiry,
          issuer: 'trendible-backend',
          audience: 'trendible-frontend'
        }
      ) as string;
      
      logInfo('Refresh token generated successfully', { userId });
      return token;
    } catch (error) {
      logError('Failed to generate refresh token', error);
      throw new Error('Refresh token generation failed');
    }
  },

  verifyToken(token: string): JwtPayload {
    try {
      logInfo('Verifying JWT token');
      
      const decoded = (jwt as any).verify(token, authConfig.jwt.secret, {
        issuer: 'trendible-backend',
        audience: 'trendible-frontend'
      }) as JwtPayload;
      
      logInfo('JWT token verified successfully', { userId: decoded.userId, type: decoded.type });
      return decoded;
    } catch (error) {
      logError('JWT token verification failed', error);
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  },

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  },

  generateTokenPair(userId: number, email: string): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(userId, email),
      refreshToken: this.generateRefreshToken(userId, email)
    };
  }
};