import { Request, Response } from 'express';
import { userService, CreateUserData, UpdateUserData } from '../services/userService';
import { handleGeneralError } from '../utils/generalErrorHandler';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { ProcessedResponse } from '../middleware/responseFormatter';

interface CreateUserRequest extends Request {
  body: CreateUserData;
}

interface UpdateUserRequest extends Request {
  body: UpdateUserData;
  params: {
    id: string;
  };
}

interface GetUserRequest extends Request {
  params: {
    id: string;
  };
}

export const userController = {
  async createUser(req: CreateUserRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { email, name } = req.body;

      if (!email) {
        return processedRes.apiBadRequest('Email is required');
      }

      const emailExists = await userService.checkEmailExists(email);
      if (emailExists) {
        return processedRes.apiBadRequest('Email already exists');
      }

      logInfo('User creation request', { email, name });

      const user = await userService.createUser({ email, name });
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }, {
        message: 'User created successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'createUser');
      
      logError('User creation failed', apiError, {
        apiEndpoint: '/api/users',
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'USER_CREATION_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async getUserById(req: GetUserRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return processedRes.apiBadRequest('Invalid user ID');
      }

      logInfo('Get user by ID request', { userId });

      const user = await userService.findUserById(userId);
      const responseTime = Date.now() - startTime;

      if (!user) {
        return processedRes.apiNotFound('User not found');
      }

      processedRes.apiSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }, {
        message: 'User retrieved successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'getUserById');
      
      logError('Get user by ID failed', apiError, {
        apiEndpoint: `/api/users/${req.params.id}`,
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'USER_RETRIEVAL_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async getAllUsers(req: Request, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      logInfo('Get all users request');

      const users = await userService.getAllUsers();
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        count: users.length
      }, {
        message: 'Users retrieved successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'getAllUsers');
      
      logError('Get all users failed', apiError, {
        apiEndpoint: '/api/users',
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'USERS_RETRIEVAL_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async updateUser(req: UpdateUserRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const userId = parseInt(req.params.id);
      const { email, name } = req.body;
      
      if (isNaN(userId)) {
        return processedRes.apiBadRequest('Invalid user ID');
      }

      if (email) {
        const emailExists = await userService.checkEmailExists(email);
        const currentUser = await userService.findUserById(userId);
        
        if (emailExists && currentUser?.email !== email) {
          return processedRes.apiBadRequest('Email already exists');
        }
      }

      logInfo('Update user request', { userId, email, name });

      const user = await userService.updateUser(userId, { email, name });
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }, {
        message: 'User updated successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'updateUser');
      
      logError('User update failed', apiError, {
        apiEndpoint: `/api/users/${req.params.id}`,
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'USER_UPDATE_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async deleteUser(req: GetUserRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return processedRes.apiBadRequest('Invalid user ID');
      }

      logInfo('Delete user request', { userId });

      const user = await userService.deleteUser(userId);
      const responseTime = Date.now() - startTime;

      processedRes.apiSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }, {
        message: 'User deleted successfully',
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = handleGeneralError(error, 'deleteUser');
      
      logError('User deletion failed', apiError, {
        apiEndpoint: `/api/users/${req.params.id}`,
        responseTime
      });

      res.status(apiError.statusCode || 500).json({
        success: false,
        error: apiError.message,
        code: 'USER_DELETION_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};