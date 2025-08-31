import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import seoRoutes from './routes/seoRoutes';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import { logInfo } from './utils/dataForSEOLogger';
import { authConfig } from './config/authConfig';
import passport from './config/passportConfig';

// Import Phase 3 middleware
import { 
  requestProcessor, 
  validateContentType, 
  validateBodySize, 
  requestTimeout, 
  responseTimeTracker 
} from './middleware/requestProcessor';
import { 
  responseFormatter, 
  corsConfig, 
  apiVersioning 
} from './middleware/responseFormatter';
import { InputValidator } from './middleware/inputValidator';
import { BatchProcessor } from './middleware/batchProcessor';

dotenv.config();

export const prisma = new PrismaClient();

const app: Express = express();
const port = process.env.PORT || 3000;

// Phase 3: Frontend Integration Middleware Stack
// Order matters - these run in sequence

// 1. Request processing and logging
app.use(requestProcessor);
app.use(responseTimeTracker);

// 2. CORS configuration for frontend access
app.use(corsConfig);

// 3. API versioning
app.use(apiVersioning);

// 4. Session and authentication middleware
app.use(session(authConfig.session));
app.use(passport.initialize());
app.use(passport.session());

// 5. Body parsing with validation
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateContentType);
app.use(validateBodySize);

// 6. Input sanitization
app.use(InputValidator.sanitize);

// 7. Response formatting
app.use(responseFormatter);

// 8. Request timeout protection
app.use(requestTimeout(120000)); // 2 minutes

// 9. Batch processing middleware
app.use(BatchProcessor.batchMiddleware({
  maxBatchSize: 20,
  maxConcurrency: 5,
  timeoutMs: 300000, // 5 minutes
  retryAttempts: 2
}));

// Root endpoint
app.get('/', (req: Request, res: any) => {
  res.apiSuccess({
    message: 'Welcome to Trendible Backend API',
    version: '2.0.0',
    status: 'running',
    phase: 'Phase 3 - Frontend Integration Layer',
    services: {
      seo: '/api/seo',
      users: '/api/users',
      auth: '/api/auth'
    },
    documentation: '/api/seo/docs',
    features: [
      'Request processing and logging',
      'Response formatting for frontend',
      'Input validation and sanitization', 
      'Batch request handling',
      'CORS configuration',
      'API versioning support',
      'Request timeout protection',
      'Error handling for frontend'
    ]
  }, {
    message: 'Trendible Backend API is operational'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/users', userRoutes);

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`🔐 Auth API available at http://localhost:${port}/api/auth`);
  console.log(`📊 SEO API available at http://localhost:${port}/api/seo`);
  console.log(`👥 Users API available at http://localhost:${port}/api/users`);
  console.log(`📖 Auth Documentation at http://localhost:${port}/api/auth/docs`);
  console.log(`📖 SEO Documentation at http://localhost:${port}/api/seo/docs`);
  console.log(`📄 Users Documentation at http://localhost:${port}/api/users/docs`);
  console.log(`🏥 Health Check at http://localhost:${port}/api/seo/status`);
  
  logInfo('Trendible Backend started successfully', {
    port,
    environment: process.env.NODE_ENV || 'development',
    services: ['auth', 'seo', 'users'],
    endpoints: {
      root: '/',
      auth: '/api/auth',
      seo: '/api/seo',
      users: '/api/users',
      authDocs: '/api/auth/docs',
      docs: '/api/seo/docs',
      userDocs: '/api/users/docs',
      status: '/api/seo/status'
    }
  });
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});