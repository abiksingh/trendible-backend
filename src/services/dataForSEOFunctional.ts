// Functional DataForSEO Service - Main Entry Point
import { dataForSEOConfig } from '../config/dataForSEOConfig';

import {
  searchGoogleOrganic,
  searchGooglePaidAds,
  getKeywordData,
  SimpleSearchRequest,
  SimpleKeywordRequest
} from './dataForSEOSimple';

import {
  handleApiError,
  withRetry,
  validateResponse,
  executeApiCall,
  isRetryableError,
  extractCostFromError
} from '../utils/dataForSEOErrorHandlers';

import {
  logInfo,
  logError,
  logWarn,
  logDebug,
  logApiCall,
  logApiCost
} from '../utils/dataForSEOLogger';

// Simple connection test utility
export const testDataForSEOConnection = async (): Promise<boolean> => {
  const endpoint = '/v3/user';
  
  try {
    const response = await fetch(`${dataForSEOConfig.instance.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${dataForSEOConfig.instance.credentials.username}:${dataForSEOConfig.instance.credentials.password}`)}`
      }
    });
    
    return response.ok;
  } catch (error) {
    logError('DataForSEO connection test failed', error);
    return false;
  }
};

// Configuration getter
export const getDataForSEOConfig = () => ({
  endpoints: dataForSEOConfig.instance.endpoints,
  defaults: dataForSEOConfig.instance.defaults,
  rateLimits: dataForSEOConfig.instance.rateLimits,
  locations: dataForSEOConfig.instance.getLocationOptions(),
  languages: dataForSEOConfig.instance.getLanguageOptions(),
  devices: dataForSEOConfig.instance.getDeviceOptions(),
  costLimits: dataForSEOConfig.instance.getCostLimits()
});

// Re-export only used utilities
export {
  // SERP operations
  searchGoogleOrganic,
  searchGooglePaidAds,
  
  // Keywords operations
  getKeywordData,
  
  // Error handling utilities
  handleApiError,
  withRetry,
  validateResponse,
  executeApiCall,
  isRetryableError,
  extractCostFromError,
  
  // Logging utilities
  logInfo,
  logError,
  logWarn,
  logDebug,
  logApiCall,
  logApiCost
};

// Convenience function for initialization check
export const initializeDataForSEO = async (): Promise<boolean> => {
  logInfo('Initializing DataForSEO functional service');
  
  const connectionTest = await testDataForSEOConnection();
  
  if (connectionTest) {
    logInfo('DataForSEO service initialized successfully');
    return true;
  } else {
    logError('DataForSEO service initialization failed');
    return false;
  }
};

// Get service status and configuration
export const getServiceStatus = () => {
  const config = getDataForSEOConfig();
  
  return {
    initialized: true,
    configuration: {
      endpoints: Object.keys(config.endpoints).length,
      defaultLocation: config.defaults.LOCATION_CODE,
      defaultLanguage: config.defaults.LANGUAGE_CODE,
      rateLimit: config.rateLimits.DEFAULT_REQUESTS_PER_MINUTE,
      maxRetries: config.rateLimits.MAX_SIMULTANEOUS_REQUESTS
    },
    availableOperations: [
      'searchGoogleOrganic',
      'searchGooglePaidAds',
      'getKeywordData'
    ]
  };
};

// Type exports
export type {
  SimpleSearchRequest,
  SimpleKeywordRequest
};