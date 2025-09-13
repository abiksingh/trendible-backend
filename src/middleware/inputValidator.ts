import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ProcessedResponse } from './responseFormatter';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

class InputValidator {
  // Sanitize string inputs with Zod preprocessing
  private static createSanitizedString() {
    return z.string()
      .transform((value) => {
        if (typeof value !== 'string') return value;
        
        return value
          .trim()
          .replace(/[<>]/g, '') // Remove potential HTML tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, '') // Remove event handlers
          .substring(0, 10000); // Limit length
      });
  }

  // Create validation middleware using Zod schemas
  static validate(schemas: ValidationSchemas) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const processedRes = res as ProcessedResponse;
      const errors: string[] = [];

      try {
        // Validate and sanitize body
        if (schemas.body) {
          const result = await schemas.body.safeParseAsync(req.body);
          if (!result.success) {
            errors.push(...this.formatZodErrors(result.error, 'body'));
          } else {
            req.body = result.data; // Use validated and transformed data
          }
        }

        // Validate query parameters
        if (schemas.query) {
          const result = await schemas.query.safeParseAsync(req.query);
          if (!result.success) {
            errors.push(...this.formatZodErrors(result.error, 'query'));
          } else {
            req.query = result.data as any;
          }
        }

        // Validate URL parameters
        if (schemas.params) {
          const result = await schemas.params.safeParseAsync(req.params);
          if (!result.success) {
            errors.push(...this.formatZodErrors(result.error, 'params'));
          } else {
            req.params = result.data as any;
          }
        }

        if (errors.length > 0) {
          return processedRes.apiBadRequest('Validation failed', {
            errors,
            fields_with_errors: errors.length
          });
        }

        next();
      } catch (error) {
        console.error('Validation error:', error);
        return processedRes.apiBadRequest('Validation error occurred', {
          errors: ['Internal validation error'],
          fields_with_errors: 1
        });
      }
    };
  }

  // Format Zod errors into user-friendly messages
  private static formatZodErrors(zodError: ZodError<any>, section: string): string[] {
    return zodError.issues.map((error: any) => {
      const path = error.path.length > 0 ? error.path.join('.') : 'root';
      const field = `${section}.${path}`;
      
      switch (error.code) {
        case 'invalid_type':
          return `${field} must be of type ${error.expected}, received ${error.received}`;
        case 'too_small':
          if (error.type === 'string') {
            return `${field} must be at least ${error.minimum} characters long`;
          }
          return `${field} must be at least ${error.minimum}`;
        case 'too_big':
          if (error.type === 'string') {
            return `${field} must be no more than ${error.maximum} characters long`;
          }
          return `${field} must be no more than ${error.maximum}`;
        case 'invalid_string':
          if (error.validation === 'email') {
            return `${field} must be a valid email address`;
          }
          if (error.validation === 'regex') {
            return `${field} format is invalid`;
          }
          return `${field} is invalid`;
        case 'invalid_enum_value':
          return `${field} must be one of: ${error.options.join(', ')}`;
        default:
          return error.message || `${field} is invalid`;
      }
    });
  }

  // Legacy sanitize method for backward compatibility
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
          sanitized[key] = value
            .trim()
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .substring(0, 10000);
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

// Zod validation schemas for SEO endpoints
export const seoValidationSchemas = {
  keywordIntelligence: {
    body: z.object({
      keyword: z.string()
        .min(1, "Keyword is required")
        .max(200, "Keyword must be no more than 200 characters")
        .transform((value) => value.trim().replace(/[<>]/g, '').substring(0, 200)),
      
      location_code: z.coerce.number()
        .int("Location code must be an integer")
        .min(1, "Location code must be at least 1")
        .max(9999, "Location code must be no more than 9999")
        .optional(),
      
      language_code: z.string()
        .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Language code format is invalid (e.g., 'en', 'en-US')")
        .optional(),
      
      source: z.enum(['google', 'bing', 'youtube'], {
        message: "Source must be one of: google, bing, youtube"
      })
    })
  },

  keywordEnhancedAnalytics: {
    body: z.object({
      keyword: z.string()
        .min(1, "Keyword is required")
        .max(200, "Keyword must be no more than 200 characters")
        .transform((value) => value.trim().replace(/[<>]/g, '').substring(0, 200)),
      
      location_code: z.coerce.number()
        .int("Location code must be an integer")
        .min(1, "Location code must be at least 1")
        .max(9999, "Location code must be no more than 9999")
        .optional(),
      
      language_code: z.string()
        .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Language code format is invalid (e.g., 'en', 'en-US')")
        .optional(),
      
      location_name: z.string()
        .min(2, "Location name must be at least 2 characters")
        .max(100, "Location name must be no more than 100 characters")
        .transform((value) => value.trim().replace(/[<>]/g, '').substring(0, 100))
        .optional()
    })
  }
};

// Infer TypeScript types from Zod schemas
export type KeywordIntelligenceRequest = z.infer<typeof seoValidationSchemas.keywordIntelligence.body>;
export type KeywordEnhancedAnalyticsRequest = z.infer<typeof seoValidationSchemas.keywordEnhancedAnalytics.body>;

export { InputValidator, z };