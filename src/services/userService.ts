import { User } from '@prisma/client';
import { prisma } from '../server';
import { logInfo, logError } from '../utils/dataForSEOLogger';

export interface CreateUserData {
  email: string;
  name?: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
}

export const userService = {
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      logInfo('Creating new user', { email: userData.email });
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name
        }
      });
      
      logInfo('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logError('Failed to create user', error, { apiEndpoint: 'userService.createUser' });
      throw error;
    }
  },

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
  }
};