import { Request, Response } from 'express';
import { searchGoogleOrganic } from '../services/dataForSEOFunctional';
import { handleApiError } from '../utils/dataForSEOErrorHandlers';
import { logInfo, logError } from '../utils/dataForSEOLogger';

interface SerpRequest extends Request {
  body: {
    keyword: string;
    location_code?: number;
    language_code?: string;
    device?: string;
    location_name?: string;
  };
}

export const serpController = {
  async searchOrganic(req: SerpRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      const { keyword, location_code, language_code, device, location_name } = req.body;

      // Input validation
      if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Keyword is required and must be a non-empty string',
          code: 'INVALID_KEYWORD'
        });
      }

      if (keyword.length > 200) {
        return res.status(400).json({
          success: false,
          error: 'Keyword must be less than 200 characters',
          code: 'KEYWORD_TOO_LONG'
        });
      }

      logInfo('SERP organic search request', { 
        keyword: keyword.substring(0, 50),
        location_code,
        language_code,
        device 
      });

      const searchParams = {
        keyword: keyword.trim(),
        location_code,
        language_code,
        device,
        location_name
      };

      const response = await searchGoogleOrganic(searchParams);
      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          keyword: keyword.trim(),
          location_code: location_code || 2840,
          language_code: language_code || 'en',
          results: response.tasks?.[0]?.result || [],
          total_results: response.tasks?.[0]?.result?.length || 0,
          cost: response.cost || 0
        },
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1'
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'searchOrganic');
      
      logError('SERP organic search failed', dataForSEOError, {
        apiEndpoint: '/api/seo/serp/organic',
        responseTime
      });

      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: dataForSEOError.statusCode === 402 ? 'INSUFFICIENT_CREDITS' :
              dataForSEOError.statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' :
              dataForSEOError.statusCode === 401 ? 'INVALID_CREDENTIALS' :
              'API_ERROR',
        cost: dataForSEOError.cost || 0,
        retryable: dataForSEOError.retryable,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async batchSearch(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const { keywords, location_code, language_code, device } = req.body;

      // Input validation
      if (!Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Keywords must be a non-empty array',
          code: 'INVALID_KEYWORDS'
        });
      }

      if (keywords.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 10 keywords allowed per batch request',
          code: 'TOO_MANY_KEYWORDS'
        });
      }

      // Validate each keyword
      for (const keyword of keywords) {
        if (typeof keyword !== 'string' || keyword.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'All keywords must be non-empty strings',
            code: 'INVALID_KEYWORD_FORMAT'
          });
        }
      }

      logInfo('SERP batch search request', {
        keyword_count: keywords.length,
        keywords: keywords.slice(0, 3).map((k: string) => k.substring(0, 30)),
        location_code,
        language_code
      });

      const searchPromises = keywords.map((keyword: string) =>
        searchGoogleOrganic({
          keyword: keyword.trim(),
          location_code,
          language_code,
          device
        }).catch(error => ({ error: handleApiError(error, 'batchSearch'), keyword }))
      );

      const results: any[] = await Promise.all(searchPromises);
      const responseTime = Date.now() - startTime;

      const successfulResults = results.filter((result: any) => !('error' in result));
      const failedResults = results.filter((result: any) => 'error' in result);
      const totalCost = results.reduce((sum: number, result: any) => {
        if ('error' in result) {
          return sum + (result.error.cost || 0);
        }
        return sum + (result.cost || 0);
      }, 0);

      res.json({
        success: true,
        data: {
          successful_searches: successfulResults.length,
          failed_searches: failedResults.length,
          results: successfulResults.map((result: any) => ({
            keyword: result.tasks?.[0]?.data?.keyword || 'unknown',
            results: result.tasks?.[0]?.result || [],
            total_results: result.tasks?.[0]?.result?.length || 0,
            cost: result.cost || 0
          })),
          errors: failedResults.map((result: any) => ({
            keyword: result.keyword,
            error: result.error.message,
            retryable: result.error.retryable
          })),
          total_cost: totalCost
        },
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1'
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'batchSearch');
      
      logError('SERP batch search failed', dataForSEOError, {
        apiEndpoint: '/api/seo/serp/batch',
        responseTime
      });

      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: 'BATCH_SEARCH_ERROR',
        cost: dataForSEOError.cost || 0,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};