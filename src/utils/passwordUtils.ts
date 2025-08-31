import bcrypt from 'bcryptjs';
import { authConfig } from '../config/authConfig';
import { logInfo, logError } from './dataForSEOLogger';

export const passwordUtils = {
  async hashPassword(password: string): Promise<string> {
    try {
      logInfo('Hashing password');
      const hashedPassword = await bcrypt.hash(password, authConfig.bcrypt.saltRounds);
      logInfo('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      logError('Failed to hash password', error);
      throw new Error('Password hashing failed');
    }
  },

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      logInfo('Validating password');
      const isValid = await bcrypt.compare(password, hashedPassword);
      logInfo('Password validation completed', { isValid });
      return isValid;
    } catch (error) {
      logError('Failed to validate password', error);
      throw new Error('Password validation failed');
    }
  },

  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};