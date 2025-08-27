import { Router } from 'express';
import researchRoutes from './researchRoutes';
import { initializeDataForSEO, getServiceStatus } from '../services/dataForSEOFunctional';

const router = Router();

// SEO API Routes
router.use('/research', researchRoutes);

// Service status and health check routes
router.get('/status', async (req, res) => {
  try {
    const status = getServiceStatus();
    const initialized = await initializeDataForSEO();
    
    res.json({
      success: true,
      service: 'Trendible SEO API',
      status: initialized ? 'operational' : 'degraded',
      version: 'v1',
      configuration: status.configuration,
      available_endpoints: {
        research: [
          'POST /api/seo/research/keyword-intelligence - Comprehensive keyword analysis'
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'Trendible SEO API',
      status: 'error',
      error: 'Service initialization failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    service: 'Trendible SEO API',
    version: 'v1',
    description: 'Keyword intelligence API powered by DataForSEO',
    base_url: `${req.protocol}://${req.get('host')}/api/seo`,
    endpoints: {
      '/research/keyword-intelligence': {
        method: 'POST',
        description: 'Get comprehensive keyword analysis with search volume, competition, intent, trends, and SERP features',
        body: {
          keyword: 'string (required) - Target keyword to analyze',
          location_code: 'number (optional) - Location code (default: 2840 US)',
          language_code: 'string (optional) - Language code (default: en)',
          source: 'string (required) - Data source: "google", "bing", or "youtube"'
        },
        example: {
          keyword: 'digital marketing',
          location_code: 2840,
          language_code: 'en',
          source: 'google'
        },
        response: {
          search_volume: 'Enhanced search volume data',
          competition: 'Competition analysis',
          cpc: 'Cost per click data',
          serp_features: 'SERP features analysis',
          difficulty_score: 'Keyword difficulty',
          monthly_searches: 'Historical search trends',
          search_volume_source: 'Data quality indicator'
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