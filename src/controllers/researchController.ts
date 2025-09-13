import { Request, Response } from 'express';
import { getKeywordIntelligence, getKeywordEnhancedAnalytics } from '../services/researchService';
import { handleApiError } from '../utils/dataForSEOErrorHandlers';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { ProcessedResponse } from '../middleware/responseFormatter';

interface KeywordIntelligenceRequest extends Request {
  body: {
    keyword: string;
    location_code?: number;
    language_code?: string;
    source: string; // Single data source (google, bing, or youtube)
  };
}

interface KeywordEnhancedAnalyticsRequest extends Request {
  body: {
    keyword: string;
    location_code?: number;
    language_code?: string;
    location_name?: string;
  };
}

export const researchController = {
  async getKeywordIntelligence(req: KeywordIntelligenceRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keyword, location_code, language_code, source } = req.body;

      logInfo('Keyword intelligence request', {
        keyword: keyword.substring(0, 50),
        location_code,
        language_code,
        source
      });

      // Get comprehensive keyword data from research service
      const intelligenceData = await getKeywordIntelligence({
        keyword: keyword.trim(),
        location_code,
        language_code,
        source
      });

      const responseTime = Date.now() - startTime;

      processedRes.json({
        success: true,
        data: {
          keyword: keyword.trim(),
          location_code: location_code || 2840,
          language_code: language_code || 'en',
          source_requested: source,
          ...intelligenceData
        },
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1',
          sources_queried: intelligenceData.sources_queried
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getKeywordIntelligence');
      
      logError('Keyword intelligence request failed', dataForSEOError, {
        apiEndpoint: '/api/research/keyword-intelligence',
        responseTime
      });

      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: dataForSEOError.statusCode === 402 ? 'INSUFFICIENT_CREDITS' :
              dataForSEOError.statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' :
              dataForSEOError.statusCode === 401 ? 'INVALID_CREDENTIALS' :
              'RESEARCH_ERROR',
        cost: dataForSEOError.cost || 0,
        retryable: dataForSEOError.retryable,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async getKeywordEnhancedAnalytics(req: KeywordEnhancedAnalyticsRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keyword, location_code, language_code, location_name } = req.body;

      logInfo('Enhanced keyword analytics request', {
        keyword: keyword.substring(0, 50),
        location_code,
        language_code,
        location_name
      });

      // Get enhanced analytics data combining 3 API endpoints
      const analyticsData = await getKeywordEnhancedAnalytics({
        keyword: keyword.trim(),
        location_code,
        language_code,
        location_name
      });

      const responseTime = Date.now() - startTime;

      processedRes.json({
        success: true,
        data: {
          keyword: keyword.trim(),
          location_code: location_code ?? 2840,
          language_code: language_code ?? 'en',
          location_name: location_name ?? 'United States',
          ...analyticsData
        },
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1',
          sources_queried: analyticsData.sources_queried
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getKeywordEnhancedAnalytics');
      
      logError('Enhanced keyword analytics request failed', dataForSEOError, {
        apiEndpoint: '/api/research/keyword-enhanced-analytics',
        responseTime
      });

      res.status(dataForSEOError.statusCode ?? 500).json({
        success: false,
        error: dataForSEOError.message,
        code: dataForSEOError.statusCode === 402 ? 'INSUFFICIENT_CREDITS' :
              dataForSEOError.statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' :
              dataForSEOError.statusCode === 401 ? 'INVALID_CREDENTIALS' :
              'ENHANCED_ANALYTICS_ERROR',
        cost: dataForSEOError.cost ?? 0,
        retryable: dataForSEOError.retryable,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};