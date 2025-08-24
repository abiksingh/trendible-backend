import { Request, Response } from 'express';
import { getKeywordData, getKeywordSuggestions, batchKeywordAnalysis } from '../services/dataForSEOFunctional';
import { handleApiError } from '../utils/dataForSEOErrorHandlers';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { ProcessedResponse } from '../middleware/responseFormatter';
import { DataForSEOExtractors, DataForSEOResponseHandler } from '../utils/dataForSEOResponseHandler';

interface KeywordsRequest extends Request {
  body: {
    keywords: string[];
    location_code?: number;
    language_code?: string;
  };
}

export const keywordsController = {
  async getKeywordData(req: KeywordsRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keywords, location_code, language_code } = req.body;

      // Input validation is now handled by middleware

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

      const keywordResults = DataForSEOExtractors.keywordResults(response);
      const responseSummary = DataForSEOResponseHandler.getResponseSummary(response);

      processedRes.apiSuccess({
        total_keywords: keywordResults.length,
        location_code: location_code || 2840,
        language_code: language_code || 'en',
        keywords: keywordResults.map((item: any) => ({
          keyword: item.keyword,
          search_volume: item.search_volume || 0,
          competition: item.competition || 0,
          competition_level: item.competition_level,
          cpc: item.cpc || 0,
          monthly_searches: item.monthly_searches || [],
          low_top_of_page_bid: item.low_top_of_page_bid || 0,
          high_top_of_page_bid: item.high_top_of_page_bid || 0
        })),
        cost: responseSummary.totalCost
      }, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getKeywordData');
      
      logError('Keywords data request failed', dataForSEOError, {
        apiEndpoint: '/api/seo/keywords/data',
        responseTime
      });

      processedRes.status(dataForSEOError.statusCode || 500).apiError(
        dataForSEOError.message,
        dataForSEOError.statusCode === 402 ? 'INSUFFICIENT_CREDITS' :
        dataForSEOError.statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' :
        'API_ERROR',
        {
          cost: dataForSEOError.cost || 0,
          retryable: dataForSEOError.retryable,
          response_time_ms: responseTime
        }
      );
    }
  },

  async getSuggestions(req: KeywordsRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keywords, location_code, language_code } = req.body;

      // Input validation is now handled by middleware

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

      const suggestions = DataForSEOExtractors.keywordResults(response);
      const responseSummary = DataForSEOResponseHandler.getResponseSummary(response);

      processedRes.apiSuccess({
        seed_keywords: keywords,
        total_suggestions: suggestions.length,
        location_code: location_code || 2840,
        language_code: language_code || 'en',
        suggestions: suggestions.map((item: any) => ({
          keyword: item.keyword,
          search_volume: item.search_volume || 0,
          competition: item.competition || 0,
          cpc: item.cpc || 0,
          monthly_searches: item.monthly_searches || []
        })),
        cost: responseSummary.totalCost
      }, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getSuggestions');
      
      logError('Keyword suggestions request failed', dataForSEOError, {
        apiEndpoint: '/api/seo/keywords/suggestions',
        responseTime
      });

      processedRes.status(dataForSEOError.statusCode || 500).apiError(
        dataForSEOError.message,
        'SUGGESTIONS_ERROR',
        {
          cost: dataForSEOError.cost || 0,
          retryable: dataForSEOError.retryable,
          response_time_ms: responseTime
        }
      );
    }
  },

  async batchAnalysis(req: KeywordsRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { keywords, location_code, language_code } = req.body;

      // Input validation is now handled by middleware

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

      processedRes.apiSuccess({
        keywords: keywords,
        keyword_data: {
          available: !!analysisResult.keywordData,
          results: analysisResult.keywordData ? 
            (() => {
              try {
                return DataForSEOExtractors.keywordResults(analysisResult.keywordData);
              } catch (extractError) {
                return [];
              }
            })() : [],
          cost: analysisResult.keywordData?.cost || 0
        },
        serp_data: {
          total_searches: analysisResult.serpResults.length,
          successful_searches: analysisResult.serpResults.filter(r => r.data && !r.error).length,
          results: analysisResult.serpResults.map(result => {
            if (result.error) {
              return {
                keyword: result.keyword,
                success: false,
                data: [],
                total_results: 0,
                cost: 0,
                error: result.error
              };
            }
            
            try {
              const serpResults = DataForSEOExtractors.serpResults(result.data);
              return {
                keyword: result.keyword,
                success: true,
                data: serpResults,
                total_results: serpResults.length,
                cost: result.data?.cost || 0,
                error: null
              };
            } catch (extractError) {
              return {
                keyword: result.keyword,
                success: false,
                data: [],
                total_results: 0,
                cost: result.data?.cost || 0,
                error: extractError instanceof Error ? extractError.message : 'Unknown extraction error'
              };
            }
          })
        },
        total_cost: totalCost
      }, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'batchAnalysis');
      
      logError('Batch keyword analysis failed', dataForSEOError, {
        apiEndpoint: '/api/seo/keywords/batch',
        responseTime
      });

      processedRes.status(dataForSEOError.statusCode || 500).apiError(
        dataForSEOError.message,
        'BATCH_ANALYSIS_ERROR',
        {
          cost: dataForSEOError.cost || 0,
          response_time_ms: responseTime
        }
      );
    }
  }
};