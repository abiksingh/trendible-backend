// Functional DataForSEO Service - Main Entry Point
import {
  createDataForSEOClients,
  testDataForSEOConnection,
  getDataForSEOConfig
} from '../utils/dataForSEOClient';

import {
  searchGoogleOrganic,
  getKeywordData,
  getKeywordSuggestions,
  getBacklinksOverview,
  getBulkBacklinks,
  getDomainOverview,
  getDomainTechnologies,
  batchKeywordAnalysis,
  SimpleSearchRequest,
  SimpleKeywordRequest,
  SimpleBacklinksRequest,
  SimpleDomainRequest
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

// Re-export all functional utilities for easy access
export {
  // Client utilities
  createDataForSEOClients,
  testDataForSEOConnection,
  getDataForSEOConfig,
  
  // SERP operations
  searchGoogleOrganic,
  
  // Keywords operations
  getKeywordData,
  getKeywordSuggestions,
  
  // Backlinks operations
  getBacklinksOverview,
  getBulkBacklinks,
  
  // Domain analytics operations
  getDomainOverview,
  getDomainTechnologies,
  
  // Batch operations
  batchKeywordAnalysis,
  
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
      'getKeywordData', 
      'getKeywordSuggestions',
      'getBacklinksOverview',
      'getBulkBacklinks',
      'getDomainOverview',
      'getDomainTechnologies',
      'batchKeywordAnalysis'
    ]
  };
};

// Usage examples and type exports
export type {
  SimpleSearchRequest,
  SimpleKeywordRequest,
  SimpleBacklinksRequest,
  SimpleDomainRequest
};