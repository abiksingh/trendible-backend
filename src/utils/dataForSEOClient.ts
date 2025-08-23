import * as client from 'dataforseo-client';
import { dataForSEOConfig } from '../config/dataForSEOConfig';
import { DataForSEOResponse } from '../types/dataForSEO.types';

// Functional authentication utilities
export const createAuthenticatedFetch = (username?: string, password?: string) => {
  const user = username || dataForSEOConfig.credentials.username;
  const pass = password || dataForSEOConfig.credentials.password;
  
  if (!user || !pass) {
    throw new Error('DataForSEO credentials are required. Please check your environment variables.');
  }

  return (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    const credentials = btoa(`${user}:${pass}`);
    const authHeader = { 'Authorization': `Basic ${credentials}` };
    
    const headers = {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init?.headers || {})
    };

    const fetchInit = {
      ...init,
      headers,
      timeout: dataForSEOConfig.defaults.TIMEOUT
    };

    return fetch(url, fetchInit);
  };
};

// API Client Factory Functions
export const createSerpClient = (authenticatedFetch?: any) => {
  const fetchFn = authenticatedFetch || createAuthenticatedFetch();
  return new client.SerpApi(dataForSEOConfig.baseUrl, { fetch: fetchFn });
};

export const createKeywordsClient = (authenticatedFetch?: any) => {
  const fetchFn = authenticatedFetch || createAuthenticatedFetch();
  return new client.KeywordsDataApi(dataForSEOConfig.baseUrl, { fetch: fetchFn });
};

export const createBacklinksClient = (authenticatedFetch?: any) => {
  const fetchFn = authenticatedFetch || createAuthenticatedFetch();
  return new client.BacklinksApi(dataForSEOConfig.baseUrl, { fetch: fetchFn });
};

export const createDomainAnalyticsClient = (authenticatedFetch?: any) => {
  const fetchFn = authenticatedFetch || createAuthenticatedFetch();
  return new client.DomainAnalyticsApi(dataForSEOConfig.baseUrl, { fetch: fetchFn });
};

// Batch client creation
export const createDataForSEOClients = () => {
  const authenticatedFetch = createAuthenticatedFetch();
  
  return {
    serp: createSerpClient(authenticatedFetch),
    keywords: createKeywordsClient(authenticatedFetch),
    backlinks: createBacklinksClient(authenticatedFetch),
    domainAnalytics: createDomainAnalyticsClient(authenticatedFetch)
  };
};

// Connection test utility
export const testDataForSEOConnection = async (username?: string, password?: string): Promise<boolean> => {
  const endpoint = '/v3/user';
  const user = username || dataForSEOConfig.credentials.username;
  const pass = password || dataForSEOConfig.credentials.password;
  
  try {
    const response = await fetch(`${dataForSEOConfig.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${user}:${pass}`)}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('DataForSEO connection test failed:', error);
    return false;
  }
};

// Configuration getter
export const getDataForSEOConfig = () => ({
  endpoints: dataForSEOConfig.endpoints,
  defaults: dataForSEOConfig.defaults,
  rateLimits: dataForSEOConfig.rateLimits,
  locations: dataForSEOConfig.getLocationOptions(),
  languages: dataForSEOConfig.getLanguageOptions(),
  devices: dataForSEOConfig.getDeviceOptions(),
  costLimits: dataForSEOConfig.getCostLimits()
});