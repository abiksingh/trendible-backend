import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import userRoutes from './routes/userRoutes';
import seoRoutes from './routes/seoRoutes';
import { logInfo } from './utils/dataForSEOLogger';

dotenv.config();

export const prisma = new PrismaClient();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware (basic setup)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to Trendible Backend API',
    version: '1.0.0',
    status: 'running',
    services: {
      users: '/api/users',
      seo: '/api/seo'
    },
    documentation: '/api/seo/docs'
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/seo', seoRoutes);

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📊 SEO API available at http://localhost:${port}/api/seo`);
  console.log(`📖 API Documentation at http://localhost:${port}/api/seo/docs`);
  console.log(`🏥 Health Check at http://localhost:${port}/api/seo/status`);
  
  logInfo('Trendible Backend started successfully', {
    port,
    environment: process.env.NODE_ENV || 'development',
    services: ['users', 'seo'],
    endpoints: {
      root: '/',
      users: '/api/users',
      seo: '/api/seo',
      docs: '/api/seo/docs',
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