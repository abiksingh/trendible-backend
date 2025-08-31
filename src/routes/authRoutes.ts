import { Router, Request, Response } from 'express';
import { authController } from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// API documentation endpoint (must come before other routes)
router.get('/docs', (req, res) => {
  res.json({
    service: 'Trendible Authentication API',
    version: 'v1',
    description: 'JWT-based authentication API for Trendible platform',
    base_url: `${req.protocol}://${req.get('host')}/api/auth`,
    endpoints: {
      'POST /register': {
        description: 'Register a new user account',
        body: {
          email: 'string (required) - User email address',
          password: 'string (required) - User password (min 8 chars, uppercase, lowercase, number)',
          name: 'string (optional) - User full name'
        },
        example: {
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe'
        },
        response: {
          success: true,
          data: {
            user: 'User object (without password)',
            tokens: {
              accessToken: 'JWT access token (15min expiry)',
              refreshToken: 'JWT refresh token (7 days expiry)'
            }
          }
        }
      },
      'POST /login': {
        description: 'Login with email and password',
        body: {
          email: 'string (required) - User email address',
          password: 'string (required) - User password'
        },
        example: {
          email: 'user@example.com',
          password: 'SecurePass123'
        },
        response: {
          success: true,
          data: {
            user: 'User object (without password)',
            tokens: {
              accessToken: 'JWT access token',
              refreshToken: 'JWT refresh token'
            }
          }
        }
      },
      'POST /refresh': {
        description: 'Refresh access token using refresh token',
        body: {
          refreshToken: 'string (required) - Valid refresh token'
        },
        response: {
          success: true,
          data: {
            tokens: {
              accessToken: 'New JWT access token',
              refreshToken: 'New JWT refresh token'
            }
          }
        }
      },
      'POST /logout': {
        description: 'Logout and invalidate refresh token',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        response: {
          success: true,
          data: {},
          message: 'Logout successful'
        }
      },
      'GET /me': {
        description: 'Get current authenticated user information',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        response: {
          success: true,
          data: {
            user: 'Current user object (without password)'
          }
        }
      },
      'POST /reset-password': {
        description: 'Reset user password (admin/support function)',
        body: {
          email: 'string (required) - User email address',
          newPassword: 'string (required) - New password (same requirements as registration)'
        },
        example: {
          email: 'user@example.com',
          newPassword: 'NewSecurePass123'
        },
        response: {
          success: true,
          data: {
            user: 'Updated user object (without password)'
          }
        },
        notes: 'This endpoint invalidates all existing refresh tokens for security'
      }
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      access_token_expiry: '15 minutes',
      refresh_token_expiry: '7 days'
    },
    password_requirements: {
      min_length: 8,
      must_contain: [
        'At least one uppercase letter',
        'At least one lowercase letter', 
        'At least one number'
      ]
    },
    error_codes: {
      REGISTRATION_ERROR: 'Failed to register user (duplicate email, validation error)',
      LOGIN_ERROR: 'Failed to login (invalid credentials, server error)',
      TOKEN_REFRESH_ERROR: 'Failed to refresh token (invalid/expired refresh token)',
      LOGOUT_ERROR: 'Failed to logout',
      GET_USER_ERROR: 'Failed to get user information',
      PASSWORD_RESET_ERROR: 'Failed to reset password (user not found, validation error)',
      VALIDATION_ERROR: 'Invalid input data',
      AUTHENTICATION_ERROR: 'Invalid or expired token'
    }
  });
});

// Authentication Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authenticateJWT, (req: Request, res: Response) => authController.logout(req as any, res));
router.get('/me', authenticateJWT, (req: Request, res: Response) => authController.getCurrentUser(req as any, res));

export default router;