import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

// API documentation endpoint (must come before parameterized routes)
router.get('/docs', (req, res) => {
  res.json({
    service: 'Trendible User API',
    version: 'v1',
    description: 'User management API for Trendible platform',
    base_url: `${req.protocol}://${req.get('host')}/api/users`,
    endpoints: {
      'POST /': {
        description: 'Create a new user',
        body: {
          email: 'string (required) - User email address',
          name: 'string (optional) - User full name'
        },
        example: {
          email: 'user@example.com',
          name: 'John Doe'
        },
        response: {
          success: true,
          data: {
            user: {
              id: 'number',
              email: 'string',
              name: 'string | null',
              createdAt: 'ISO datetime',
              updatedAt: 'ISO datetime'
            }
          }
        }
      },
      'GET /': {
        description: 'Get all users',
        response: {
          success: true,
          data: {
            users: 'Array of user objects',
            count: 'number'
          }
        }
      },
      'GET /:id': {
        description: 'Get user by ID',
        params: {
          id: 'number (required) - User ID'
        },
        response: {
          success: true,
          data: {
            user: 'User object'
          }
        }
      },
      'PUT /:id': {
        description: 'Update user by ID',
        params: {
          id: 'number (required) - User ID'
        },
        body: {
          email: 'string (optional) - New email address',
          name: 'string (optional) - New name'
        },
        response: {
          success: true,
          data: {
            user: 'Updated user object'
          }
        }
      },
      'DELETE /:id': {
        description: 'Delete user by ID',
        params: {
          id: 'number (required) - User ID'
        },
        response: {
          success: true,
          data: {
            user: 'Deleted user object'
          }
        }
      }
    },
    validation: {
      email: 'Must be unique across all users',
      name: 'Optional field, can be null'
    },
    error_codes: {
      USER_CREATION_ERROR: 'Failed to create user (duplicate email, validation error)',
      USER_RETRIEVAL_ERROR: 'Failed to retrieve user',
      USER_UPDATE_ERROR: 'Failed to update user (duplicate email, user not found)',
      USER_DELETION_ERROR: 'Failed to delete user (user not found)',
      VALIDATION_ERROR: 'Invalid input data'
    }
  });
});

// User CRUD Routes
router.post('/', userController.createUser);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;