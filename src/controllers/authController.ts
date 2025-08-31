import { Request, Response } from 'express';
import { userService, RegisterUserData } from '../services/userService';
import { handleGeneralError } from '../utils/generalErrorHandler';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { ProcessedResponse } from '../middleware/responseFormatter';
import { AuthenticatedRequest } from '../types/auth.types';
import { passwordUtils } from '../utils/passwordUtils';
import { jwtUtils } from '../utils/jwtUtils';

interface RegisterRequest extends Request {
  body: RegisterUserData;
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

interface RefreshTokenRequest extends Request {
  body: {
    refreshToken: string;
  };
}

interface ResetPasswordRequest extends Request {
  body: {
    email: string;
    newPassword: string;
  };
}

export const authController = {
  async register(req: RegisterRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return processedRes.apiBadRequest('Email and password are required');
      }

      const passwordValidation = passwordUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return processedRes.apiBadRequest('Password does not meet requirements', {
          errors: passwordValidation.errors
        });
      }

      const emailExists = await userService.checkEmailExists(email);
      if (emailExists) {
        return processedRes.apiBadRequest('Email already exists');
      }

      logInfo('User registration request', { email, name });

      const user = await userService.registerUser({ email, password, name });
      const tokens = jwtUtils.generateTokenPair(user.id, user.email);
      
      await userService.updateUserRefreshToken(user.id, tokens.refreshToken);
      
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      }, {
        message: 'User registered successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'register');
      
      logError('User registration failed', apiError, {
        apiEndpoint: '/api/auth/register',
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'REGISTRATION_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async login(req: LoginRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return processedRes.apiBadRequest('Email and password are required');
      }

      logInfo('User login request', { email });

      const user = await userService.validateUserPassword(email, password);
      
      if (!user) {
        return processedRes.apiUnauthorized('Invalid email or password');
      }

      const tokens = jwtUtils.generateTokenPair(user.id, user.email);
      await userService.updateUserRefreshToken(user.id, tokens.refreshToken);
      
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      }, {
        message: 'Login successful',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'login');
      
      logError('User login failed', apiError, {
        apiEndpoint: '/api/auth/login',
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'LOGIN_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async refreshToken(req: RefreshTokenRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return processedRes.apiBadRequest('Refresh token is required');
      }

      logInfo('Token refresh request');

      const payload = jwtUtils.verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        return processedRes.apiBadRequest('Invalid token type');
      }

      const user = await userService.findUserByRefreshToken(refreshToken);
      
      if (!user || user.id !== payload.userId) {
        return processedRes.apiUnauthorized('Invalid refresh token');
      }

      const tokens = jwtUtils.generateTokenPair(user.id, user.email);
      await userService.updateUserRefreshToken(user.id, tokens.refreshToken);
      
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      }, {
        message: 'Token refreshed successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'refreshToken');
      
      logError('Token refresh failed', apiError, {
        apiEndpoint: '/api/auth/refresh',
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'TOKEN_REFRESH_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async logout(req: AuthenticatedRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        return processedRes.apiUnauthorized('Authentication required');
      }

      logInfo('User logout request', { userId: req.user.id });

      await userService.updateUserRefreshToken(req.user.id, null);
      
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({}, {
        message: 'Logout successful',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'logout');
      
      logError('User logout failed', apiError, {
        apiEndpoint: '/api/auth/logout',
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'LOGOUT_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async getCurrentUser(req: AuthenticatedRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        return processedRes.apiUnauthorized('Authentication required');
      }

      logInfo('Get current user request', { userId: req.user.id });
      
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt
        }
      }, {
        message: 'Current user retrieved successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'getCurrentUser');
      
      logError('Get current user failed', apiError, {
        apiEndpoint: '/api/auth/me',
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'GET_USER_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async resetPassword(req: ResetPasswordRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return processedRes.apiBadRequest('Email and new password are required');
      }

      const passwordValidation = passwordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return processedRes.apiBadRequest('Password does not meet requirements', {
          errors: passwordValidation.errors
        });
      }

      const userExists = await userService.checkEmailExists(email);
      if (!userExists) {
        return processedRes.apiNotFound('User not found');
      }

      logInfo('Password reset request', { email });

      const user = await userService.resetUserPassword(email, newPassword);
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          updatedAt: user.updatedAt
        }
      }, {
        message: 'Password reset successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'resetPassword');
      
      logError('Password reset failed', apiError, {
        apiEndpoint: '/api/auth/reset-password',
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'PASSWORD_RESET_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};