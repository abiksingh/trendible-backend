import { Request, Response, NextFunction } from 'express';
import { ProcessedResponse } from './responseFormatter';
import { logInfo, logWarn } from '../utils/dataForSEOLogger';

interface BatchRequestConfig {
  maxBatchSize: number;
  maxConcurrency: number;
  timeoutMs: number;
  retryAttempts: number;
}

interface BatchItem {
  id: string;
  data: any;
  priority?: 'low' | 'normal' | 'high';
}

interface BatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  cost?: number;
  processingTime: number;
}

interface BatchResponse<T = any> {
  total_items: number;
  successful_items: number;
  failed_items: number;
  total_cost: number;
  total_processing_time: number;
  results: BatchResult<T>[];
  summary: {
    success_rate: number;
    average_cost_per_item: number;
    average_processing_time: number;
  };
}

class BatchProcessor {
  private static defaultConfig: BatchRequestConfig = {
    maxBatchSize: 50,
    maxConcurrency: 10,
    timeoutMs: 300000, // 5 minutes
    retryAttempts: 2
  };

  // Process batch requests with concurrency control
  static async processBatch<T>(
    items: BatchItem[],
    processor: (item: BatchItem) => Promise<T>,
    config: Partial<BatchRequestConfig> = {}
  ): Promise<BatchResponse<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    if (items.length > finalConfig.maxBatchSize) {
      throw new Error(`Batch size ${items.length} exceeds maximum of ${finalConfig.maxBatchSize}`);
    }

    logInfo('Starting batch processing', {
      totalItems: items.length,
      maxConcurrency: finalConfig.maxConcurrency,
      timeout: finalConfig.timeoutMs
    });

    // Sort by priority (high -> normal -> low)
    const sortedItems = items.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'normal'];
      const bPriority = priorityOrder[b.priority || 'normal'];
      return bPriority - aPriority;
    });

    const results: BatchResult<T>[] = [];
    let totalCost = 0;

    // Process items in chunks based on concurrency limit
    for (let i = 0; i < sortedItems.length; i += finalConfig.maxConcurrency) {
      const chunk = sortedItems.slice(i, i + finalConfig.maxConcurrency);
      
      const chunkPromises = chunk.map(async (item): Promise<BatchResult<T>> => {
        const itemStartTime = Date.now();
        let attempts = 0;
        let lastError: any;

        while (attempts <= finalConfig.retryAttempts) {
          try {
            const data = await Promise.race([
              processor(item),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Item processing timeout')), finalConfig.timeoutMs)
              )
            ]);

            const processingTime = Date.now() - itemStartTime;
            const cost = (data as any)?.cost || 0;
            totalCost += cost;

            return {
              id: item.id,
              success: true,
              data,
              cost,
              processingTime
            };
          } catch (error) {
            lastError = error;
            attempts++;
            
            if (attempts <= finalConfig.retryAttempts) {
              logWarn(`Batch item ${item.id} failed, retrying (${attempts}/${finalConfig.retryAttempts})`, {
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
            }
          }
        }

        const processingTime = Date.now() - itemStartTime;
        return {
          id: item.id,
          success: false,
          error: lastError instanceof Error ? lastError.message : 'Unknown error',
          cost: (lastError as any)?.cost || 0,
          processingTime
        };
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    const totalProcessingTime = Date.now() - startTime;
    const successfulItems = results.filter(r => r.success).length;
    const failedItems = results.length - successfulItems;

    const response: BatchResponse<T> = {
      total_items: items.length,
      successful_items: successfulItems,
      failed_items: failedItems,
      total_cost: totalCost,
      total_processing_time: totalProcessingTime,
      results,
      summary: {
        success_rate: (successfulItems / items.length) * 100,
        average_cost_per_item: totalCost / items.length,
        average_processing_time: totalProcessingTime / items.length
      }
    };

    logInfo('Batch processing completed', {
      totalItems: items.length,
      successfulItems,
      failedItems,
      totalCost,
      totalProcessingTime: `${totalProcessingTime}ms`,
      successRate: `${response.summary.success_rate.toFixed(2)}%`
    });

    return response;
  }

  // Middleware to handle batch requests
  static batchMiddleware(config: Partial<BatchRequestConfig> = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add batch processing method to request
      (req as any).processBatch = async <T>(
        items: BatchItem[],
        processor: (item: BatchItem) => Promise<T>
      ): Promise<BatchResponse<T>> => {
        return BatchProcessor.processBatch(items, processor, config);
      };

      next();
    };
  }

  // Validate batch request structure
  static validateBatchRequest(req: Request, res: Response, next: NextFunction) {
    const processedRes = res as ProcessedResponse;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return processedRes.apiBadRequest('Batch request must contain an "items" array');
    }

    if (items.length === 0) {
      return processedRes.apiBadRequest('Batch request cannot be empty');
    }

    // Validate each item has required fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.id) {
        return processedRes.apiBadRequest(`Item at index ${i} is missing required "id" field`);
      }
      if (!item.data) {
        return processedRes.apiBadRequest(`Item at index ${i} is missing required "data" field`);
      }
    }

    next();
  }

  // Create batch items from array of data
  static createBatchItems(dataArray: any[], priority: BatchItem['priority'] = 'normal'): BatchItem[] {
    return dataArray.map((data, index) => ({
      id: `batch_item_${index}_${Date.now()}`,
      data,
      priority
    }));
  }

  // Split large batches into smaller chunks
  static splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

// Middleware for automatic batch splitting
export const autoBatchSplitter = (maxBatchSize: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { keywords, domains } = req.body;

    // Auto-split keywords array if too large
    if (Array.isArray(keywords) && keywords.length > maxBatchSize) {
      req.body.keywords = keywords.slice(0, maxBatchSize);
      res.setHeader('X-Batch-Truncated', 'true');
      res.setHeader('X-Original-Count', keywords.length.toString());
      res.setHeader('X-Processed-Count', maxBatchSize.toString());
    }

    // Auto-split domains array if too large
    if (Array.isArray(domains) && domains.length > maxBatchSize) {
      req.body.domains = domains.slice(0, maxBatchSize);
      res.setHeader('X-Batch-Truncated', 'true');
      res.setHeader('X-Original-Count', domains.length.toString());
      res.setHeader('X-Processed-Count', maxBatchSize.toString());
    }

    next();
  };
};

// Priority queue for batch processing
class PriorityQueue<T> {
  private queue: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number = 0) {
    this.queue.push({ item, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): T | undefined {
    return this.queue.shift()?.item;
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

export { 
  BatchProcessor, 
  BatchItem, 
  BatchResult, 
  BatchResponse, 
  BatchRequestConfig,
  PriorityQueue 
};