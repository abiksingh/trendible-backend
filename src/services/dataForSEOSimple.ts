// Simplified HTTP-based DataForSEO Operations
import { withRetry, handleApiError } from '../utils/dataForSEOErrorHandlers';
import { logApiCall, logApiCost, logInfo } from '../utils/dataForSEOLogger';
import { dataForSEOConfig } from '../config/dataForSEOConfig';

// Simple request interfaces
export interface SimpleSearchRequest {
  keyword: string;
  location_code?: number;
  language_code?: string;
  device?: string;
  location_name?: string;
}

export interface SimpleKeywordRequest {
  keywords: string[];
  location_code?: number;
  language_code?: string;
}

export interface SimpleBacklinksRequest {
  target: string;
  limit?: number;
  offset?: number;
  include_subdomains?: boolean;
}

export interface SimpleDomainRequest {
  target: string;
  location_code?: number;
  language_code?: string;
}

// HTTP client utility
const createHttpClient = () => {
  const baseURL = dataForSEOConfig.baseUrl;
  const auth = btoa(`${dataForSEOConfig.credentials.username}:${dataForSEOConfig.credentials.password}`);
  
  return {
    async post(endpoint: string, data: any) {
      const url = `${baseURL}${endpoint}`;
      const startTime = Date.now();
      
      logApiCall(`POST ${endpoint}`, { 
        endpoint,
        requestData: data
      }, startTime);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([data])
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.cost) {
        logApiCost(endpoint, result.cost);
      }

      return result;
    },
    
    async postRaw(endpoint: string, dataArray: any[]) {
      const url = `${baseURL}${endpoint}`;
      const startTime = Date.now();
      
      logApiCall(`POST ${endpoint}`, { 
        endpoint,
        requestData: dataArray
      }, startTime);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataArray)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.cost) {
        logApiCost(endpoint, result.cost);
      }

      return result;
    }
  };
};

// SERP Operations
export const searchGoogleOrganic = async (params: SimpleSearchRequest) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    const data = {
      keyword: params.keyword,
      location_code: params.location_code || 2840,
      language_code: params.language_code || 'en',
      device: params.device || 'desktop'
    };

    return await client.post('/v3/serp/google/organic/live/advanced', data);
  }, 'searchGoogleOrganic');
};

// Keywords Operations
export const getKeywordData = async (params: SimpleKeywordRequest) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    const data = {
      keywords: params.keywords,
      location_code: params.location_code || 2840,
      language_code: params.language_code || 'en'
    };

    return await client.post('/v3/keywords_data/google/search_volume/live', data);
  }, 'getKeywordData');
};

// Extended historical keyword data using Google Ads endpoint
export const getKeywordDataExtended = async (params: SimpleKeywordRequest & { date_from?: string; date_to?: string }) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    const data = {
      keywords: params.keywords,
      location_code: params.location_code || 2840,
      language_code: params.language_code || 'en',
      ...(params.date_from && { date_from: params.date_from }),
      ...(params.date_to && { date_to: params.date_to })
    };
    return await client.post('/v3/keywords_data/google_ads/search_volume/live', data);
  }, 'getKeywordDataExtended');
};

export const getKeywordSuggestions = async (params: SimpleKeywordRequest) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    // DataForSEO Labs keyword suggestions expects single keyword, not array
    // If multiple keywords provided, use first one
    const keyword = Array.isArray(params.keywords) ? params.keywords[0] : params.keywords[0];
    
    const requestData = [{
      keyword: keyword,
      location_code: params.location_code || 2840,
      language_code: params.language_code || 'en',
      limit: 100,
      include_seed_keyword: true,
      include_serp_info: true
    }];

    return await client.postRaw(dataForSEOConfig.endpoints.KEYWORDS_SUGGESTIONS, requestData);
  }, 'getKeywordSuggestions');
};

// Backlinks Operations  
export const getBacklinksOverview = async (params: SimpleBacklinksRequest) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    const data = [{
      target: params.target,
      include_subdomains: params.include_subdomains || false
    }];

    return await client.post('/v3/backlinks/summary/live', data);
  }, 'getBacklinksOverview');
};

export const getBulkBacklinks = async (params: SimpleBacklinksRequest) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    const data = [{
      target: params.target,
      limit: params.limit || 100,
      offset: params.offset || 0,
      include_subdomains: params.include_subdomains || false
    }];

    return await client.post('/v3/backlinks/backlinks/live', data);
  }, 'getBulkBacklinks');
};

// Domain Operations
export const getDomainOverview = async (params: SimpleDomainRequest) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    const data = {
      target: params.target
    };

    return await client.post('/v3/domain_analytics/whois/overview/live', data);
  }, 'getDomainOverview');
};

export const getDomainTechnologies = async (params: SimpleDomainRequest) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    const data = {
      target: params.target
    };

    return await client.post('/v3/domain_analytics/technologies/domain_technologies/live', data);
  }, 'getDomainTechnologies');
};

// Batch Operations
export const batchKeywordAnalysis = async (keywords: string[], options: { location_code?: number; language_code?: string } = {}) => {
  try {
    // Get keyword data
    const keywordDataPromise = getKeywordData({
      keywords,
      location_code: options.location_code,
      language_code: options.language_code
    }).catch(error => {
      logInfo('Keyword data request failed in batch', { error: error.message });
      return null;
    });

    // Get SERP data for each keyword
    const serpPromises = keywords.map(keyword => 
      searchGoogleOrganic({
        keyword,
        location_code: options.location_code,
        language_code: options.language_code
      }).then(data => ({ keyword, data, error: null }))
      .catch(error => ({ keyword, data: null, error: error.message }))
    );

    const [keywordData, ...serpResults] = await Promise.all([
      keywordDataPromise,
      ...serpPromises
    ]);

    return {
      keywordData,
      serpResults
    };
  } catch (error) {
    logInfo('Batch keyword analysis failed', { error });
    throw handleApiError(error, 'batchKeywordAnalysis');
  }
};