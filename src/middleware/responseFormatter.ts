import { Request, Response, NextFunction } from 'express';
import { logDebug } from '../utils/dataForSEOLogger';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  meta: {
    timestamp: string;
    request_id: string;
    response_time_ms?: number;
    api_version: string;
    pagination?: {
      page: number;
      limit: number;
      total?: number;
      has_more?: boolean;
    };
  };
  cost?: number;
  rate_limit?: {
    remaining: number;
    reset_time: string;
  };
}

interface ProcessedRequest extends Request {
  requestId: string;
  startTime: number;
}

// Extend Response to include our custom methods
interface ProcessedResponse extends Response {
  apiSuccess: <T>(data: T, options?: ApiSuccessOptions) => Response;
  apiError: (error: string, code?: string, options?: ApiErrorOptions) => Response;
  apiBadRequest: (error: string, details?: any) => Response;
  apiNotFound: (resource?: string) => Response;
  apiUnauthorized: (message?: string) => Response;
  apiForbidden: (message?: string) => Response;
  apiInternalError: (message?: string) => Response;
  apiRateLimit: (resetTime: Date, remaining?: number) => Response;
}

interface ApiSuccessOptions {
  message?: string;
  cost?: number;
  response_time_ms?: number;
  pagination?: {
    page: number;
    limit: number;
    total?: number;
    has_more?: boolean;
  };
}

interface ApiErrorOptions {
  code?: string;
  cost?: number;
  response_time_ms?: number;
  details?: any;
  retryable?: boolean;
}

// Response formatter middleware
export const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  const processedReq = req as ProcessedRequest;
  const processedRes = res as ProcessedResponse;
  const createMeta = (additionalData?: any) => ({
    timestamp: new Date().toISOString(),
    request_id: processedReq.requestId,
    response_time_ms: Date.now() - processedReq.startTime,
    api_version: 'v1',
    ...additionalData
  });

  // Success response method
  processedRes.apiSuccess = function<T>(data: T, options: ApiSuccessOptions = {}): Response {
    const metaOptions: any = {};
    if (options.pagination) metaOptions.pagination = options.pagination;
    if (options.response_time_ms) metaOptions.response_time_ms = options.response_time_ms;
    
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: createMeta(metaOptions),
      ...(options.cost && { cost: options.cost }),
      ...(options.message && { message: options.message })
    };

    logDebug('API success response', {
      requestId: processedReq.requestId,
      dataType: typeof data,
      cost: options.cost
    });

    return this.json(response);
  };

  // Error response method
  processedRes.apiError = function(error: string, code?: string, options: ApiErrorOptions = {}): Response {
    const statusCode = this.statusCode || 500;
    
    const metaOptions: any = {};
    if (options.response_time_ms) metaOptions.response_time_ms = options.response_time_ms;
    
    const response: ApiResponse = {
      success: false,
      error,
      code: code || options.code || getDefaultErrorCode(statusCode),
      meta: createMeta(metaOptions),
      ...(options.cost && { cost: options.cost }),
      ...(options.details && { details: options.details }),
      ...(options.retryable !== undefined && { retryable: options.retryable })
    };

    logDebug('API error response', {
      requestId: processedReq.requestId,
      error,
      code: options.code,
      statusCode
    });

    return this.status(statusCode).json(response);
  };

  // Bad request (400) response
  processedRes.apiBadRequest = function(error: string, details?: any): Response {
    return this.status(400).apiError(error, 'BAD_REQUEST', {
      details,
      retryable: false
    });
  };

  // Not found (404) response
  processedRes.apiNotFound = function(resource = 'Resource'): Response {
    return this.status(404).apiError(`${resource} not found`, 'NOT_FOUND', {
      retryable: false
    });
  };

  // Unauthorized (401) response
  processedRes.apiUnauthorized = function(message = 'Authentication required'): Response {
    return this.status(401).apiError(message, 'UNAUTHORIZED', {
      retryable: false
    });
  };

  // Forbidden (403) response
  processedRes.apiForbidden = function(message = 'Access forbidden'): Response {
    return this.status(403).apiError(message, 'FORBIDDEN', {
      retryable: false
    });
  };

  // Internal server error (500) response
  processedRes.apiInternalError = function(message = 'Internal server error'): Response {
    return this.status(500).apiError(message, 'INTERNAL_SERVER_ERROR', {
      retryable: true
    });
  };

  // Rate limit (429) response
  processedRes.apiRateLimit = function(resetTime: Date, remaining = 0): Response {
    const response: ApiResponse = {
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      meta: createMeta(),
      rate_limit: {
        remaining,
        reset_time: resetTime.toISOString()
      }
    };

    return this.status(429).json(response);
  };

  next();
};

// Helper function to get default error codes
function getDefaultErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 413: return 'PAYLOAD_TOO_LARGE';
    case 422: return 'UNPROCESSABLE_ENTITY';
    case 429: return 'RATE_LIMIT_EXCEEDED';
    case 500: return 'INTERNAL_SERVER_ERROR';
    case 502: return 'BAD_GATEWAY';
    case 503: return 'SERVICE_UNAVAILABLE';
    case 504: return 'GATEWAY_TIMEOUT';
    default: return 'UNKNOWN_ERROR';
  }
}

// CORS configuration middleware
export const corsConfig = (req: Request, res: Response, next: NextFunction) => {
  // Allow multiple origins (configure based on environment)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID'
  ].join(', '));
  res.header('Access-Control-Expose-Headers', [
    'X-Request-ID',
    'X-Response-Time',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ].join(', '));
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
};

// API versioning middleware
export const apiVersioning = (req: Request, res: Response, next: NextFunction) => {
  // Extract version from header or URL
  const versionHeader = req.get('API-Version');
  const versionFromUrl = req.originalUrl.match(/\/v(\d+)\//)?.[1];
  
  const apiVersion = versionHeader || versionFromUrl || '1';
  
  // Add version to request for controllers to use
  (req as any).apiVersion = `v${apiVersion}`;
  
  // Add version to response headers
  res.setHeader('API-Version', `v${apiVersion}`);
  
  next();
};

export type { ApiResponse, ApiSuccessOptions, ApiErrorOptions, ProcessedResponse };