import { Request, Response, NextFunction } from 'express';
import { logInfo, logWarn, logError } from '../utils/dataForSEOLogger';

interface ProcessedRequest extends Request {
  startTime: number;
  requestId: string;
  clientInfo?: {
    userAgent?: string;
    ip?: string;
    origin?: string;
  };
}

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

// Request processing middleware
export const requestProcessor = (req: Request, res: Response, next: NextFunction) => {
  const processedReq = req as ProcessedRequest;
  // Add request metadata
  processedReq.startTime = Date.now();
  processedReq.requestId = generateRequestId();
  processedReq.clientInfo = {
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    origin: req.get('Origin')
  };

  // Add request ID to response headers
  res.setHeader('X-Request-ID', processedReq.requestId);
  
  // Log incoming request
  logInfo('Incoming API request', {
    requestId: processedReq.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: processedReq.clientInfo?.userAgent,
    ip: processedReq.clientInfo?.ip,
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type')
  });

  next();
};

// Request validation middleware
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json',
        code: 'INVALID_CONTENT_TYPE',
        details: {
          received: contentType || 'none',
          expected: 'application/json'
        }
      });
    }
  }
  next();
};

// Body size validation middleware
export const validateBodySize = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    logWarn('Request body too large', {
      contentLength,
      maxSize,
      url: req.originalUrl
    });

    return res.status(413).json({
      success: false,
      error: 'Request body too large',
      code: 'PAYLOAD_TOO_LARGE',
      details: {
        received_bytes: contentLength,
        max_bytes: maxSize
      }
    });
  }
  next();
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 120000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logError('Request timeout', {
          url: req.originalUrl,
          method: req.method,
          timeout: timeoutMs
        });

        res.status(504).json({
          success: false,
          error: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
          details: {
            timeout_ms: timeoutMs,
            message: 'The request took too long to complete'
          }
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
};

// Response time tracking middleware
export const responseTimeTracker = (req: Request, res: Response, next: NextFunction) => {
  const processedReq = req as ProcessedRequest;
  res.on('finish', () => {
    const responseTime = Date.now() - processedReq.startTime;
    
    logInfo('API request completed', {
      requestId: processedReq.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length')
    });

    // Headers cannot be set after response is sent, so we just log the completion
  });

  next();
};