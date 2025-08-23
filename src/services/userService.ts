import { prisma } from '../server';
import { User } from '@prisma/client';

type CreateUserData = {
  email: string;
  name?: string;
};

type UpdateUserData = {
  email?: string;
  name?: string;
};

export const userService = {
  async getAllUsers(): Promise<User[]> {
    return await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  async getUserById(id: number): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
    });
  },

  async getUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email }
    });
  },

  async createUser(data: CreateUserData): Promise<User> {
    return await prisma.user.create({
      data
    });
  },

  async updateUser(id: number, data: UpdateUserData): Promise<User | null> {
    try {
      return await prisma.user.update({
        where: { id },
        data
      });
    } catch (error) {
      return null;
    }
  },

  async deleteUser(id: number): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
};