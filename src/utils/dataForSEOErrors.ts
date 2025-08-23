import { DataForSEOLogger } from './dataForSEOLogger';

interface DataForSEOErrorDetails {
  statusCode: number;
  message: string;
  endpoint?: string;
  originalError?: any;
  retryable?: boolean;
  cost?: number;
}

class DataForSEOError extends Error {
  public statusCode: number;
  public endpoint?: string;
  public originalError?: any;
  public retryable: boolean;
  public cost?: number;

  constructor(details: DataForSEOErrorDetails) {
    super(details.message);
    this.name = 'DataForSEOError';
    this.statusCode = details.statusCode;
    this.endpoint = details.endpoint;
    this.originalError = details.originalError;
    this.retryable = details.retryable || false;
    this.cost = details.cost;

    Error.captureStackTrace?.(this, DataForSEOError);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      retryable: this.retryable,
      cost: this.cost
    };
  }
}

class DataForSEOErrorHandler {
  private logger: DataForSEOLogger;

  constructor() {
    this.logger = new DataForSEOLogger();
  }

  handleApiError(error: any, endpoint?: string): DataForSEOError {
    if (error instanceof DataForSEOError) {
      return error;
    }

    let statusCode = 500;
    let message = 'Unknown DataForSEO API error';
    let retryable = false;
    let cost = 0;

    if (error.response) {
      statusCode = error.response.status;
      message = error.response.statusText || error.response.data?.status_message || message;
      cost = error.response.data?.cost || 0;

      switch (statusCode) {
        case 401:
          message = 'Invalid DataForSEO API credentials';
          retryable = false;
          break;
        case 402:
          message = 'Insufficient DataForSEO API credits';
          retryable = false;
          break;
        case 429:
          message = 'DataForSEO API rate limit exceeded';
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = 'DataForSEO API server error';
          retryable = true;
          break;
      }
    } else if (error.code) {
      switch (error.code) {
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
        case 'ETIMEDOUT':
          message = 'DataForSEO API connection failed';
          retryable = true;
          break;
        case 'ECONNABORTED':
          message = 'DataForSEO API request timeout';
          retryable = true;
          break;
      }
    }

    const dataForSEOError = new DataForSEOError({
      statusCode,
      message,
      endpoint,
      originalError: error,
      retryable,
      cost
    });

    this.logger.logApiError(endpoint || 'unknown', dataForSEOError, Date.now());

    return dataForSEOError;
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    endpoint: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: DataForSEOError;
    let totalCost = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        
        this.logger.logApiCall(endpoint, undefined, startTime);
        
        if (totalCost > 0) {
          this.logger.logApiCost(endpoint, totalCost);
        }

        return result;
      } catch (error) {
        const dataForSEOError = this.handleApiError(error, endpoint);
        lastError = dataForSEOError;
        totalCost += dataForSEOError.cost || 0;

        if (!dataForSEOError.retryable || attempt === maxRetries) {
          this.logger.error(
            `DataForSEO API operation failed after ${attempt + 1} attempts`,
            dataForSEOError,
            { endpoint, cost: totalCost }
          );
          throw dataForSEOError;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        this.logger.warn(
          `DataForSEO API attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          { error: dataForSEOError.message },
          { endpoint }
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  validateResponse(response: any, endpoint: string): void {
    if (!response) {
      throw new DataForSEOError({
        statusCode: 500,
        message: 'Empty response from DataForSEO API',
        endpoint
      });
    }

    if (response.status_code !== 20000) {
      throw new DataForSEOError({
        statusCode: response.status_code || 500,
        message: response.status_message || 'DataForSEO API error',
        endpoint,
        cost: response.cost || 0
      });
    }

    if (!response.tasks || response.tasks.length === 0) {
      throw new DataForSEOError({
        statusCode: 404,
        message: 'No data returned from DataForSEO API',
        endpoint,
        cost: response.cost || 0
      });
    }

    const task = response.tasks[0];
    if (task.status_code !== 20000) {
      throw new DataForSEOError({
        statusCode: task.status_code || 500,
        message: task.status_message || 'DataForSEO task failed',
        endpoint,
        cost: response.cost || 0
      });
    }
  }

  isRetryableError(error: any): boolean {
    return error instanceof DataForSEOError && error.retryable;
  }

  extractCostFromError(error: any): number {
    return error instanceof DataForSEOError ? error.cost || 0 : 0;
  }
}

export { DataForSEOError, DataForSEOErrorHandler, DataForSEOErrorDetails };