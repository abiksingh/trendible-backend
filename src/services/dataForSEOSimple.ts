// Simplified Functional DataForSEO Operations
import * as client from 'dataforseo-client';
import { createDataForSEOClients } from '../utils/dataForSEOClient';
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

// SERP Operations
export const searchGoogleOrganic = async (params: SimpleSearchRequest) => {
  const startTime = Date.now();
  const endpoint = dataForSEOConfig.endpoints.SERP_GOOGLE_ORGANIC;
  
  logInfo('Starting Google organic search', params);
  
  return withRetry(async () => {
    const clients = createDataForSEOClients();
    
    const task = new client.SerpGoogleOrganicLiveAdvancedRequestInfo();
    task.keyword = params.keyword;
    task.location_code = params.location_code || dataForSEOConfig.defaults.LOCATION_CODE;
    task.language_code = params.language_code || dataForSEOConfig.defaults.LANGUAGE_CODE;
    task.device = params.device || dataForSEOConfig.defaults.DEVICE;
    
    if (params.location_name) task.location_name = params.location_name;
    
    const response = await clients.serp.googleOrganicLiveAdvanced([task]);
    
    if (!response) {
      throw new Error('No response received from DataForSEO API');
    }

    logApiCall(endpoint, params, startTime);
    if (response.cost && response.cost > 0) logApiCost(endpoint, response.cost);

    return response;
  }, endpoint);
};

// Keywords Operations
export const getKeywordData = async (params: SimpleKeywordRequest) => {
  const startTime = Date.now();
  const endpoint = dataForSEOConfig.endpoints.KEYWORDS_GOOGLE_ADS;
  
  logInfo('Getting keyword data', { 
    keywords: params.keywords.slice(0, 5), 
    count: params.keywords.length 
  });
  
  return withRetry(async () => {
    const clients = createDataForSEOClients();
    
    const task = new client.KeywordsDataGoogleAdsKeywordsForKeywordsLiveRequestInfo();
    task.keywords = params.keywords.slice(0, 20); // API limit
    task.location_code = params.location_code || dataForSEOConfig.defaults.LOCATION_CODE;
    task.language_code = params.language_code || dataForSEOConfig.defaults.LANGUAGE_CODE;
    
    const response = await clients.keywords.googleAdsKeywordsForKeywordsLive([task]);
    
    if (!response) {
      throw new Error('No response received from DataForSEO API');
    }

    logApiCall(endpoint, params, startTime);
    if (response.cost && response.cost > 0) logApiCost(endpoint, response.cost);

    return response;
  }, endpoint);
};

export const getKeywordSuggestions = async (params: SimpleKeywordRequest) => {
  const startTime = Date.now();
  const endpoint = dataForSEOConfig.endpoints.KEYWORDS_SUGGESTIONS;
  
  logInfo('Getting keyword suggestions', params);
  
  return withRetry(async () => {
    const clients = createDataForSEOClients();
    
    const task = new client.KeywordsDataGoogleAdsSearchVolumeLiveRequestInfo();
    task.keywords = params.keywords;
    task.location_code = params.location_code || dataForSEOConfig.defaults.LOCATION_CODE;
    task.language_code = params.language_code || dataForSEOConfig.defaults.LANGUAGE_CODE;
    
    const response = await clients.keywords.googleAdsSearchVolumeLive([task]);
    
    if (!response) {
      throw new Error('No response received from DataForSEO API');
    }

    logApiCall(endpoint, params, startTime);
    if (response.cost && response.cost > 0) logApiCost(endpoint, response.cost);

    return response;
  }, endpoint);
};

// Backlinks Operations
export const getBacklinksOverview = async (params: SimpleBacklinksRequest) => {
  const startTime = Date.now();
  const endpoint = dataForSEOConfig.endpoints.BACKLINKS_OVERVIEW;
  
  logInfo('Getting backlinks overview', params);
  
  return withRetry(async () => {
    const clients = createDataForSEOClients();
    
    const task = new client.BacklinksSummaryLiveRequestInfo();
    task.target = params.target;
    
    if (params.include_subdomains !== undefined) {
      task.include_subdomains = params.include_subdomains;
    }
    
    const response = await clients.backlinks.summaryLive([task]);
    
    if (!response) {
      throw new Error('No response received from DataForSEO API');
    }

    logApiCall(endpoint, params, startTime);
    if (response.cost && response.cost > 0) logApiCost(endpoint, response.cost);

    return response;
  }, endpoint);
};

export const getBulkBacklinks = async (params: SimpleBacklinksRequest) => {
  const startTime = Date.now();
  const endpoint = dataForSEOConfig.endpoints.BACKLINKS_BULK;
  
  logInfo('Getting bulk backlinks', params);
  
  return withRetry(async () => {
    const clients = createDataForSEOClients();
    
    const task = new client.BacklinksBulkBacklinksLiveRequestInfo();
    task.target = params.target;
    
    if (params.limit) task.limit = params.limit;
    if (params.offset) task.offset = params.offset;
    
    const response = await clients.backlinks.bulkBacklinksLive([task]);
    
    if (!response) {
      throw new Error('No response received from DataForSEO API');
    }

    logApiCall(endpoint, params, startTime);
    if (response.cost && response.cost > 0) logApiCost(endpoint, response.cost);

    return response;
  }, endpoint);
};

// Domain Operations
export const getDomainOverview = async (params: SimpleDomainRequest) => {
  const startTime = Date.now();
  const endpoint = '/v3/domain_analytics/whois/overview/live';
  
  logInfo('Getting domain analytics overview', params);
  
  return withRetry(async () => {
    const clients = createDataForSEOClients();
    
    const task = new client.DomainAnalyticsWhoisOverviewLiveRequestInfo();
    task.target = params.target;
    
    const response = await clients.domainAnalytics.whoisOverviewLive([task]);
    
    if (!response) {
      throw new Error('No response received from DataForSEO API');
    }

    logApiCall(endpoint, params, startTime);
    if (response.cost && response.cost > 0) logApiCost(endpoint, response.cost);

    return response;
  }, endpoint);
};

export const getDomainTechnologies = async (params: SimpleDomainRequest) => {
  const startTime = Date.now();
  const endpoint = dataForSEOConfig.endpoints.DOMAIN_ANALYTICS_TECH;
  
  logInfo('Getting domain technologies', params);
  
  return withRetry(async () => {
    const clients = createDataForSEOClients();
    
    const task = new client.DomainAnalyticsTechnologiesDomainTechnologiesLiveRequestInfo();
    task.target = params.target;
    
    const response = await clients.domainAnalytics.technologiesDomainTechnologiesLive([task]);
    
    if (!response) {
      throw new Error('No response received from DataForSEO API');
    }

    logApiCall(endpoint, params, startTime);
    if (response.cost && response.cost > 0) logApiCost(endpoint, response.cost);

    return response;
  }, endpoint);
};

// Batch operations
export const batchKeywordAnalysis = async (
  keywords: string[],
  options?: { location_code?: number; language_code?: string; }
) => {
  logInfo('Starting batch keyword analysis', { 
    keywords: keywords.slice(0, 5), 
    count: keywords.length 
  });

  const keywordParams: SimpleKeywordRequest = {
    keywords,
    location_code: options?.location_code,
    language_code: options?.language_code
  };

  try {
    const [keywordData, ...serpResults] = await Promise.allSettled([
      getKeywordData(keywordParams),
      ...keywords.slice(0, 5).map(keyword => 
        searchGoogleOrganic({ 
          keyword, 
          location_code: options?.location_code,
          language_code: options?.language_code
        })
      )
    ]);

    return {
      keywordData: keywordData.status === 'fulfilled' ? keywordData.value : null,
      serpResults: serpResults.map((result, index) => ({
        keyword: keywords[index],
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      }))
    };
  } catch (error) {
    throw handleApiError(error, 'batchKeywordAnalysis');
  }
};