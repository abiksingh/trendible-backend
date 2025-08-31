import { dataForSEOConfig } from '../config/dataForSEOConfig';
import { DataForSEOResponse } from '../types/dataForSEO.types';

// Error types
export interface DataForSEOErrorDetails {
  statusCode: number;
  message: string;
  endpoint?: string;
  originalError?: any;
  retryable?: boolean;
  cost?: number;
}

export class DataForSEOError extends Error {
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

// Functional error handling utilities
export const handleApiError = (error: any, endpoint?: string): DataForSEOError => {
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

  return new DataForSEOError({
    statusCode,
    message,
    endpoint,
    originalError: error,
    retryable,
    cost
  });
};

// Retry utility function
export const withRetry = async <T>(
  operation: () => Promise<T>,
  endpoint: string,
  maxRetries: number = dataForSEOConfig.instance.retry.MAX_RETRIES,
  baseDelay: number = dataForSEOConfig.instance.retry.BASE_DELAY
): Promise<T> => {
  let lastError: DataForSEOError;
  let totalCost = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      const dataForSEOError = handleApiError(error, endpoint);
      lastError = dataForSEOError;
      totalCost += dataForSEOError.cost || 0;

      if (!dataForSEOError.retryable || attempt === maxRetries) {
        throw dataForSEOError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError!;
};

// Response validation
export const validateResponse = (response: any, endpoint: string): void => {
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
};

// Execute API call with error handling and validation
export const executeApiCall = async <T>(
  operation: () => Promise<DataForSEOResponse<T>>,
  endpoint: string,
  params?: any
): Promise<DataForSEOResponse<T>> => {
  return withRetry(
    async () => {
      const response = await operation();
      validateResponse(response, endpoint);
      return response;
    },
    endpoint
  );
};

// Utility functions
export const isRetryableError = (error: any): boolean => {
  return error instanceof DataForSEOError && error.retryable;
};

export const extractCostFromError = (error: any): number => {
  return error instanceof DataForSEOError ? error.cost || 0 : 0;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};