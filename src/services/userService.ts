import { User } from '@prisma/client';
import { prisma } from '../server';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { passwordUtils } from '../utils/passwordUtils';

export interface RegisterUserData {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
}

export const userService = {

  async findUserById(id: number): Promise<User | null> {
    try {
      logInfo('Finding user by ID', { userId: id });
      
      const user = await prisma.user.findUnique({
        where: { id }
      });
      
      if (user) {
        logInfo('User found', { userId: user.id, email: user.email });
      } else {
        logInfo('User not found', { userId: id });
      }
      
      return user;
    } catch (error) {
      logError('Failed to find user by ID', error, { apiEndpoint: 'userService.findUserById' });
      throw error;
    }
  },

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      logInfo('Finding user by email', { email });
      
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (user) {
        logInfo('User found by email', { userId: user.id, email: user.email });
      } else {
        logInfo('User not found by email', { email });
      }
      
      return user;
    } catch (error) {
      logError('Failed to find user by email', error, { apiEndpoint: 'userService.findUserByEmail' });
      throw error;
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      logInfo('Retrieving all users');
      
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      logInfo('Users retrieved successfully', { count: users.length });
      return users;
    } catch (error) {
      logError('Failed to retrieve all users', error);
      throw error;
    }
  },

  async updateUser(id: number, updateData: UpdateUserData): Promise<User> {
    try {
      logInfo('Updating user', { userId: id, updateData });
      
      const user = await prisma.user.update({
        where: { id },
        data: updateData
      });
      
      logInfo('User updated successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logError('Failed to update user', error, { apiEndpoint: 'userService.updateUser' });
      throw error;
    }
  },

  async deleteUser(id: number): Promise<User> {
    try {
      logInfo('Deleting user', { userId: id });
      
      const user = await prisma.user.delete({
        where: { id }
      });
      
      logInfo('User deleted successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logError('Failed to delete user', error, { apiEndpoint: 'userService.deleteUser' });
      throw error;
    }
  },

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });
      
      return !!user;
    } catch (error) {
      logError('Failed to check email existence', error, { apiEndpoint: 'userService.checkEmailExists' });
      throw error;
    }
  },

  async registerUser(userData: RegisterUserData): Promise<User> {
    try {
      logInfo('Registering new user', { email: userData.email });
      
      const hashedPassword = await passwordUtils.hashPassword(userData.password);
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword
        }
      });
      
      logInfo('User registered successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logError('Failed to register user', error, { apiEndpoint: 'userService.registerUser' });
      throw error;
    }
  },

  async validateUserPassword(email: string, password: string): Promise<User | null> {
    try {
      logInfo('Validating user password', { email });
      
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user) {
        logInfo('User not found for password validation', { email });
        return null;
      }
      
      const isValidPassword = await passwordUtils.validatePassword(password, user.password);
      
      if (!isValidPassword) {
        logInfo('Invalid password provided', { email });
        return null;
      }
      
      logInfo('Password validation successful', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logError('Failed to validate user password', error, { apiEndpoint: 'userService.validateUserPassword' });
      throw error;
    }
  },

  async updateUserRefreshToken(userId: number, refreshToken: string | null): Promise<User> {
    try {
      logInfo('Updating user refresh token', { userId });
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: { refreshToken }
      });
      
      logInfo('User refresh token updated successfully', { userId: user.id });
      return user;
    } catch (error) {
      logError('Failed to update user refresh token', error, { apiEndpoint: 'userService.updateUserRefreshToken' });
      throw error;
    }
  },

  async findUserByRefreshToken(refreshToken: string): Promise<User | null> {
    try {
      logInfo('Finding user by refresh token');
      
      const user = await prisma.user.findFirst({
        where: { refreshToken }
      });
      
      if (user) {
        logInfo('User found by refresh token', { userId: user.id });
      } else {
        logInfo('User not found by refresh token');
      }
      
      return user;
    } catch (error) {
      logError('Failed to find user by refresh token', error, { apiEndpoint: 'userService.findUserByRefreshToken' });
      throw error;
    }
  },

  async resetUserPassword(email: string, newPassword: string): Promise<User> {
    try {
      logInfo('Resetting user password', { email });
      
      const hashedPassword = await passwordUtils.hashPassword(newPassword);
      
      const user = await prisma.user.update({
        where: { email },
        data: { 
          password: hashedPassword,
          refreshToken: null
        }
      });
      
      logInfo('User password reset successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logError('Failed to reset user password', error, { apiEndpoint: 'userService.resetUserPassword' });
      throw error;
    }
  }
};