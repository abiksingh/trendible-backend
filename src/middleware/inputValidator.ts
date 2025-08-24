import { Request, Response, NextFunction } from 'express';
import { ProcessedResponse } from './responseFormatter';

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  values?: any[];
  customValidator?: (value: any) => boolean | string;
}

interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
}

class InputValidator {
  // Sanitize string inputs
  private static sanitizeString(value: string): string {
    if (typeof value !== 'string') return value;
    
    return value
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 10000); // Limit length
  }

  // Validate individual field
  private static validateField(value: any, rule: ValidationRule): string | null {
    const { field, type, required, min, max, pattern, values, customValidator } = rule;

    // Check if required
    if (required && (value === undefined || value === null || value === '')) {
      return `${field} is required`;
    }

    // Skip validation if field is optional and empty
    if (!required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Type validation
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${field} must be a string`;
        }
        if (min && value.length < min) {
          return `${field} must be at least ${min} characters long`;
        }
        if (max && value.length > max) {
          return `${field} must be no more than ${max} characters long`;
        }
        if (pattern && !pattern.test(value)) {
          return `${field} format is invalid`;
        }
        break;

      case 'number':
        const num = typeof value === 'string' ? parseInt(value) : value;
        if (typeof num !== 'number' || isNaN(num)) {
          return `${field} must be a valid number`;
        }
        if (min !== undefined && num < min) {
          return `${field} must be at least ${min}`;
        }
        if (max !== undefined && num > max) {
          return `${field} must be no more than ${max}`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return `${field} must be a boolean`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return `${field} must be an array`;
        }
        if (min && value.length < min) {
          return `${field} must contain at least ${min} items`;
        }
        if (max && value.length > max) {
          return `${field} must contain no more than ${max} items`;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `${field} must be an object`;
        }
        break;
    }

    // Value enumeration validation
    if (values && !values.includes(value)) {
      return `${field} must be one of: ${values.join(', ')}`;
    }

    // Custom validation
    if (customValidator) {
      const result = customValidator(value);
      if (typeof result === 'string') {
        return result;
      }
      if (result === false) {
        return `${field} validation failed`;
      }
    }

    return null;
  }

  // Create validation middleware
  static validate(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      const processedRes = res as ProcessedResponse;
      const errors: string[] = [];

      // Validate body
      if (schema.body) {
        for (const rule of schema.body) {
          const value = req.body?.[rule.field];
          const error = this.validateField(value, rule);
          if (error) errors.push(error);
        }
      }

      // Validate query parameters
      if (schema.query) {
        for (const rule of schema.query) {
          const value = req.query?.[rule.field];
          const error = this.validateField(value, rule);
          if (error) errors.push(error);
        }
      }

      // Validate URL parameters
      if (schema.params) {
        for (const rule of schema.params) {
          const value = req.params?.[rule.field];
          const error = this.validateField(value, rule);
          if (error) errors.push(error);
        }
      }

      if (errors.length > 0) {
        return processedRes.apiBadRequest('Validation failed', {
          errors,
          fields_with_errors: errors.length
        });
      }

      next();
    };
  }

  // Sanitize request body
  static sanitize(req: Request, res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
      req.body = InputValidator.sanitizeObject(req.body);
    }
    next();
  }

  private static sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    
    return obj;
  }
}

// Pre-defined validation schemas for SEO endpoints
export const seoValidationSchemas = {
  serpOrganic: {
    body: [
      { field: 'keyword', type: 'string' as const, required: true, min: 1, max: 200 },
      { field: 'location_code', type: 'number' as const, min: 1, max: 9999 },
      { field: 'language_code', type: 'string' as const, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ },
      { field: 'device', type: 'string' as const, values: ['desktop', 'mobile', 'tablet'] },
      { field: 'location_name', type: 'string' as const, max: 100 }
    ]
  },

  serpBatch: {
    body: [
      { field: 'keywords', type: 'array' as const, required: true, min: 1, max: 10 },
      { field: 'location_code', type: 'number' as const, min: 1, max: 9999 },
      { field: 'language_code', type: 'string' as const, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ },
      { field: 'device', type: 'string' as const, values: ['desktop', 'mobile', 'tablet'] }
    ]
  },

  keywordData: {
    body: [
      { field: 'keywords', type: 'array' as const, required: true, min: 1, max: 20 },
      { field: 'location_code', type: 'number' as const, min: 1, max: 9999 },
      { field: 'language_code', type: 'string' as const, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ }
    ]
  },

  keywordSuggestions: {
    body: [
      { field: 'keywords', type: 'array' as const, required: true, min: 1, max: 10 },
      { field: 'location_code', type: 'number' as const, min: 1, max: 9999 },
      { field: 'language_code', type: 'string' as const, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ }
    ]
  },

  keywordBatch: {
    body: [
      { field: 'keywords', type: 'array' as const, required: true, min: 1, max: 5 },
      { field: 'location_code', type: 'number' as const, min: 1, max: 9999 },
      { field: 'language_code', type: 'string' as const, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ }
    ]
  },

  backlinksOverview: {
    body: [
      { 
        field: 'target', 
        type: 'string' as const, 
        required: true, 
        min: 1, 
        max: 500,
        customValidator: (value: string) => {
          // Basic domain/URL validation
          const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
          const urlRegex = /^https?:\/\/(.+)/i;
          const cleaned = value.replace(/^https?:\/\//, '').replace(/\/$/, '');
          return domainRegex.test(cleaned) || urlRegex.test(value) || 'Invalid domain or URL format';
        }
      },
      { field: 'include_subdomains', type: 'boolean' as const }
    ]
  },

  backlinksBulk: {
    body: [
      { 
        field: 'target', 
        type: 'string' as const, 
        required: true, 
        min: 1, 
        max: 500,
        customValidator: (value: string) => {
          const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
          const urlRegex = /^https?:\/\/(.+)/i;
          const cleaned = value.replace(/^https?:\/\//, '').replace(/\/$/, '');
          return domainRegex.test(cleaned) || urlRegex.test(value) || 'Invalid domain or URL format';
        }
      },
      { field: 'limit', type: 'number' as const, min: 1, max: 1000 },
      { field: 'offset', type: 'number' as const, min: 0 },
      { field: 'include_subdomains', type: 'boolean' as const }
    ]
  },

  competitorGap: {
    body: [
      { field: 'your_domain', type: 'string' as const, required: true, min: 1, max: 200 },
      { field: 'competitor_domains', type: 'array' as const, required: true, min: 1, max: 5 }
    ]
  },

  keywordIntelligence: {
    body: [
      { field: 'keyword', type: 'string' as const, required: true, min: 1, max: 200 },
      { field: 'location_code', type: 'number' as const, min: 1, max: 9999 },
      { field: 'language_code', type: 'string' as const, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ },
      { field: 'sources', type: 'array' as const, max: 10 }
    ]
  },

  domainOverview: {
    body: [
      { 
        field: 'target', 
        type: 'string' as const, 
        required: true, 
        min: 1, 
        max: 253,
        customValidator: (value: string) => {
          const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
          const cleaned = value.replace(/^https?:\/\//, '').replace(/\/$/, '');
          return domainRegex.test(cleaned) || 'Invalid domain format';
        }
      },
      { field: 'location_code', type: 'number' as const, min: 1, max: 9999 },
      { field: 'language_code', type: 'string' as const, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ }
    ]
  },

  domainTechnologies: {
    body: [
      { 
        field: 'target', 
        type: 'string' as const, 
        required: true, 
        min: 1, 
        max: 253,
        customValidator: (value: string) => {
          const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
          const cleaned = value.replace(/^https?:\/\//, '').replace(/\/$/, '');
          return domainRegex.test(cleaned) || 'Invalid domain format';
        }
      }
    ]
  },

  domainCompare: {
    body: [
      { field: 'domains', type: 'array' as const, required: true, min: 2, max: 10 }
    ]
  }
};

export { InputValidator, ValidationRule, ValidationSchema };