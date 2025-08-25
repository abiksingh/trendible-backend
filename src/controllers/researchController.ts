import { Request, Response } from 'express';
import { 
  getKeywordIntelligence, 
  getGoogleKeywordData,
  getBingKeywordData,
  getYouTubeKeywordData,
  compareSearchEngines
} from '../services/researchService';
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

  async getGoogleAnalysis(req: KeywordIntelligenceRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keyword, location_code, language_code } = req.body;

      logInfo('Google analysis request', {
        keyword: keyword.substring(0, 50),
        location_code,
        language_code
      });

      const googleData = await getGoogleKeywordData(
        keyword.trim(),
        location_code || 2840,
        language_code || 'en'
      );

      const responseTime = Date.now() - startTime;

      processedRes.json({
        success: true,
        data: {
          keyword: keyword.trim(),
          platform: 'google',
          ...googleData.data,
          cost: googleData.cost
        },
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1'
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getGoogleAnalysis');
      
      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: 'GOOGLE_ANALYSIS_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async getBingAnalysis(req: KeywordIntelligenceRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keyword, location_code, language_code } = req.body;

      logInfo('Bing analysis request', {
        keyword: keyword.substring(0, 50),
        location_code,
        language_code
      });

      const bingData = await getBingKeywordData(
        keyword.trim(),
        location_code || 2840,
        language_code || 'en'
      );

      const responseTime = Date.now() - startTime;

      processedRes.json({
        success: true,
        data: {
          keyword: keyword.trim(),
          ...bingData.data,
          cost: bingData.cost
        },
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1'
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getBingAnalysis');
      
      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: 'BING_ANALYSIS_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async compareSearchEngines(req: KeywordIntelligenceRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keyword, location_code, language_code } = req.body;

      logInfo('Search engine comparison request', {
        keyword: keyword.substring(0, 50),
        location_code,
        language_code
      });

      const comparisonData = await compareSearchEngines(
        keyword.trim(),
        location_code || 2840,
        language_code || 'en'
      );

      const responseTime = Date.now() - startTime;

      processedRes.json({
        success: true,
        data: comparisonData,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1'
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'compareSearchEngines');
      
      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: 'COMPARISON_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async getYouTubeAnalysis(req: KeywordIntelligenceRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keyword, location_code, language_code } = req.body;

      logInfo('YouTube analysis request', {
        keyword: keyword.substring(0, 50),
        location_code,
        language_code
      });

      const youtubeData = await getYouTubeKeywordData(
        keyword.trim(),
        location_code || 2840,
        language_code || 'en'
      );

      const responseTime = Date.now() - startTime;

      processedRes.json({
        success: true,
        data: {
          keyword: keyword.trim(),
          ...youtubeData.data,
          cost: youtubeData.cost
        },
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1'
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getYouTubeAnalysis');
      
      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: 'YOUTUBE_ANALYSIS_ERROR',
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};