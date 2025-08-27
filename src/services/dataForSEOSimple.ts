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

// Google Paid Ads Operations
export const searchGooglePaidAds = async (params: SimpleSearchRequest) => {
  const client = createHttpClient();
  
  return withRetry(async () => {
    const data = {
      keyword: params.keyword,
      location_code: params.location_code || 2840,
      language_code: params.language_code || 'en',
      device: params.device || 'desktop'
    };

    return await client.post('/v3/serp/google/ads_search/live/advanced', data);
  }, 'searchGooglePaidAds');
};
