import { Router } from 'express';
import serpRoutes from './serpRoutes';
import keywordsRoutes from './keywordsRoutes';
import backlinksRoutes from './backlinksRoutes';
import domainRoutes from './domainRoutes';
import { initializeDataForSEO, getServiceStatus } from '../services/dataForSEOFunctional';

const router = Router();

// SEO API Routes
router.use('/serp', serpRoutes);
router.use('/keywords', keywordsRoutes);
router.use('/backlinks', backlinksRoutes);
router.use('/domains', domainRoutes);

// Service status and health check routes
router.get('/status', async (req, res) => {
  try {
    const status = getServiceStatus();
    const initialized = await initializeDataForSEO();
    
    res.json({
      success: true,
      service: 'DataForSEO SEO API',
      status: initialized ? 'operational' : 'degraded',
      version: 'v1',
      configuration: status.configuration,
      available_endpoints: {
        serp: [
          'POST /api/seo/serp/organic - Google organic search results',
          'POST /api/seo/serp/batch - Batch SERP analysis'
        ],
        keywords: [
          'POST /api/seo/keywords/data - Keyword metrics and data',
          'POST /api/seo/keywords/suggestions - Keyword suggestions',
          'POST /api/seo/keywords/batch - Batch keyword analysis'
        ],
        backlinks: [
          'POST /api/seo/backlinks/overview - Backlinks overview',
          'POST /api/seo/backlinks/bulk - Detailed backlinks data',
          'POST /api/seo/backlinks/competitor-gap - Competitor gap analysis'
        ],
        domains: [
          'POST /api/seo/domains/overview - Domain WHOIS and overview',
          'POST /api/seo/domains/technologies - Technology stack analysis',
          'POST /api/seo/domains/compare - Multi-domain comparison'
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'DataForSEO SEO API',
      status: 'error',
      error: 'Service initialization failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    service: 'DataForSEO SEO API',
    version: 'v1',
    description: 'Comprehensive SEO data analysis API powered by DataForSEO',
    base_url: `${req.protocol}://${req.get('host')}/api/seo`,
    endpoints: {
      '/serp/organic': {
        method: 'POST',
        description: 'Get Google organic search results for a keyword',
        body: {
          keyword: 'string (required) - Search keyword',
          location_code: 'number (optional) - Location code (default: 2840 US)',
          language_code: 'string (optional) - Language code (default: en)',
          device: 'string (optional) - Device type: desktop, mobile, tablet',
          location_name: 'string (optional) - Location name'
        },
        example: {
          keyword: 'seo tools',
          location_code: 2840,
          language_code: 'en',
          device: 'desktop'
        }
      },
      '/keywords/data': {
        method: 'POST',
        description: 'Get keyword metrics including search volume, CPC, and competition',
        body: {
          keywords: 'array (required) - Array of keywords (max 20)',
          location_code: 'number (optional) - Location code',
          language_code: 'string (optional) - Language code'
        },
        example: {
          keywords: ['seo', 'marketing', 'analytics'],
          location_code: 2840,
          language_code: 'en'
        }
      },
      '/backlinks/overview': {
        method: 'POST',
        description: 'Get backlinks overview for a domain',
        body: {
          target: 'string (required) - Target domain or URL',
          include_subdomains: 'boolean (optional) - Include subdomains'
        },
        example: {
          target: 'example.com',
          include_subdomains: true
        }
      },
      '/domains/overview': {
        method: 'POST',
        description: 'Get domain WHOIS and overview information',
        body: {
          target: 'string (required) - Target domain',
          location_code: 'number (optional) - Location code',
          language_code: 'string (optional) - Language code'
        },
        example: {
          target: 'example.com'
        }
      }
    },
    rate_limits: {
      default: '2000 requests per minute',
      keywords_live: '12 requests per minute'
    },
    authentication: 'Configure DATAFORSEO_USERNAME and DATAFORSEO_PASSWORD in environment variables',
    support: 'https://docs.dataforseo.com/v3/'
  });
});

export default router;