import { Request, Response } from 'express';
import { getKeywordData, getKeywordSuggestions, batchKeywordAnalysis } from '../services/dataForSEOFunctional';
import { handleApiError } from '../utils/dataForSEOErrorHandlers';
import { logInfo, logError } from '../utils/dataForSEOLogger';

interface KeywordsRequest extends Request {
  body: {
    keywords: string[];
    location_code?: number;
    language_code?: string;
  };
}

export const keywordsController = {
  async getKeywordData(req: KeywordsRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      const { keywords, location_code, language_code } = req.body;

      // Input validation
      if (!Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Keywords must be a non-empty array',
          code: 'INVALID_KEYWORDS'
        });
      }

      if (keywords.length > 20) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 20 keywords allowed per request (API limit)',
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

      logInfo('Keywords data request', {
        keyword_count: keywords.length,
        keywords: keywords.slice(0, 5).map(k => k.substring(0, 30)),
        location_code,
        language_code
      });

      const keywordParams = {
        keywords: keywords.map(k => k.trim()),
        location_code,
        language_code
      };

      const response = await getKeywordData(keywordParams);
      const responseTime = Date.now() - startTime;

      const keywordResults = response.tasks?.[0]?.result || [];

      res.json({
        success: true,
        data: {
          total_keywords: keywordResults.length,
          location_code: location_code || 2840,
          language_code: language_code || 'en',
          keywords: keywordResults.map(item => ({
            keyword: item.keyword,
            search_volume: item.search_volume || 0,
            competition: item.competition || 0,
            competition_level: item.competition_level,
            cpc: item.cpc || 0,
            monthly_searches: item.monthly_searches || [],
            low_top_of_page_bid: item.low_top_of_page_bid || 0,
            high_top_of_page_bid: item.high_top_of_page_bid || 0
          })),
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
      const dataForSEOError = handleApiError(error, 'getKeywordData');
      
      logError('Keywords data request failed', dataForSEOError, {
        apiEndpoint: '/api/seo/keywords/data',
        responseTime
      });

      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: dataForSEOError.statusCode === 402 ? 'INSUFFICIENT_CREDITS' :
              dataForSEOError.statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' :
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

  async getSuggestions(req: KeywordsRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      const { keywords, location_code, language_code } = req.body;

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
          error: 'Maximum 10 seed keywords allowed per request',
          code: 'TOO_MANY_KEYWORDS'
        });
      }

      logInfo('Keyword suggestions request', {
        keyword_count: keywords.length,
        keywords: keywords.slice(0, 3).map(k => k.substring(0, 30)),
        location_code
      });

      const suggestionParams = {
        keywords: keywords.map(k => k.trim()),
        location_code,
        language_code
      };

      const response = await getKeywordSuggestions(suggestionParams);
      const responseTime = Date.now() - startTime;

      const suggestions = response.tasks?.[0]?.result || [];

      res.json({
        success: true,
        data: {
          seed_keywords: keywords,
          total_suggestions: suggestions.length,
          location_code: location_code || 2840,
          language_code: language_code || 'en',
          suggestions: suggestions.map(item => ({
            keyword: item.keyword,
            search_volume: item.search_volume || 0,
            competition: item.competition || 0,
            cpc: item.cpc || 0,
            monthly_searches: item.monthly_searches || []
          })),
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
      const dataForSEOError = handleApiError(error, 'getSuggestions');
      
      logError('Keyword suggestions request failed', dataForSEOError, {
        apiEndpoint: '/api/seo/keywords/suggestions',
        responseTime
      });

      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: 'SUGGESTIONS_ERROR',
        cost: dataForSEOError.cost || 0,
        retryable: dataForSEOError.retryable,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  async batchAnalysis(req: KeywordsRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      const { keywords, location_code, language_code } = req.body;

      // Input validation
      if (!Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Keywords must be a non-empty array',
          code: 'INVALID_KEYWORDS'
        });
      }

      if (keywords.length > 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 5 keywords allowed for batch analysis',
          code: 'TOO_MANY_KEYWORDS'
        });
      }

      logInfo('Batch keyword analysis request', {
        keyword_count: keywords.length,
        keywords: keywords.map(k => k.substring(0, 30)),
        location_code
      });

      const analysisResult = await batchKeywordAnalysis(
        keywords.map(k => k.trim()),
        { location_code, language_code }
      );
      
      const responseTime = Date.now() - startTime;

      // Calculate total cost from all operations
      let totalCost = 0;
      if (analysisResult.keywordData?.cost) totalCost += analysisResult.keywordData.cost;
      
      analysisResult.serpResults.forEach(result => {
        if (result.data?.cost) totalCost += result.data.cost;
      });

      res.json({
        success: true,
        data: {
          keywords: keywords,
          keyword_data: {
            available: !!analysisResult.keywordData,
            results: analysisResult.keywordData?.tasks?.[0]?.result || [],
            cost: analysisResult.keywordData?.cost || 0
          },
          serp_data: {
            total_searches: analysisResult.serpResults.length,
            successful_searches: analysisResult.serpResults.filter(r => r.data && !r.error).length,
            results: analysisResult.serpResults.map(result => ({
              keyword: result.keyword,
              success: !result.error,
              data: result.data?.tasks?.[0]?.result || [],
              total_results: result.data?.tasks?.[0]?.result?.length || 0,
              cost: result.data?.cost || 0,
              error: result.error || null
            }))
          },
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
      const dataForSEOError = handleApiError(error, 'batchAnalysis');
      
      logError('Batch keyword analysis failed', dataForSEOError, {
        apiEndpoint: '/api/seo/keywords/batch',
        responseTime
      });

      res.status(dataForSEOError.statusCode || 500).json({
        success: false,
        error: dataForSEOError.message,
        code: 'BATCH_ANALYSIS_ERROR',
        cost: dataForSEOError.cost || 0,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};