// Legacy OOP Service (Deprecated - Use functional approach instead)
import { DataForSEOLogger } from '../utils/dataForSEOLogger';
import { DataForSEOErrorHandler } from '../utils/dataForSEOErrors';
import { 
  createDataForSEOClients,
  testDataForSEOConnection,
  getDataForSEOConfig
} from '../utils/dataForSEOClient';
import { dataForSEOConfig } from '../config/dataForSEOConfig';

/**
 * @deprecated Use functional approach from dataForSEOFunctional.ts instead
 * This class is maintained for backward compatibility only
 */
class DataForSEOService {
  private clients: any;
  private logger: DataForSEOLogger;
  private errorHandler: DataForSEOErrorHandler;

  constructor() {
    console.warn('⚠️  DataForSEOService (OOP) is deprecated. Use functional approach from dataForSEOFunctional.ts instead');
    
    this.logger = new DataForSEOLogger();
    this.errorHandler = new DataForSEOErrorHandler();
    
    this.logger.info('Initializing legacy DataForSEO service (OOP)', {
      environment: dataForSEOConfig.environment,
      baseUrl: dataForSEOConfig.baseUrl,
      recommendation: 'Consider migrating to functional approach'
    });

    this.clients = createDataForSEOClients();
  }

  async testConnection(): Promise<boolean> {
    return testDataForSEOConnection();
  }

  getConfiguration() {
    return getDataForSEOConfig();
  }

  getClients() {
    return this.clients;
  }

  getSerpApi() {
    return this.clients.serp;
  }

  getKeywordsApi() {
    return this.clients.keywords;
  }

  getBacklinksApi() {
    return this.clients.backlinks;
  }

  getDomainAnalyticsApi() {
    return this.clients.domainAnalytics;
  }

  getLogger() {
    return this.logger;
  }

  getErrorHandler() {
    return this.errorHandler;
  }

  // Legacy method - use executeApiCall from functional approach instead
  async executeApiCall<T>(
    operation: () => Promise<T>,
    endpoint: string,
    params?: any
  ): Promise<T> {
    console.warn('⚠️  Use executeApiCall from dataForSEOErrorHandlers.ts instead');
    return this.errorHandler.withRetry(operation, endpoint);
  }
}

export { DataForSEOService };