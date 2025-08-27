// Defensive DataForSEO API Response Handler
// Prevents data loss and provides better error handling

interface DataForSEOTask {
  id?: string;
  status_code?: number;
  status_message?: string;
  time?: string;
  cost?: number;
  result_count?: number;
  path?: string[];
  data?: any;
  result?: any[];
}

interface DataForSEOResponse {
  version?: string;
  status_code?: number;
  status_message?: string;
  time?: string;
  cost?: number;
  tasks_count?: number;
  tasks_ready?: number;
  tasks?: DataForSEOTask[];
}

export class DataForSEOResponseHandler {

  /**
   * Safely extracts first task's results (for single requests)
   * @param response - DataForSEO API response
   * @returns Array of results from first successful task
   */
  static extractFirstTaskResults(response: DataForSEOResponse): any[] {
    if (!response?.tasks || !Array.isArray(response.tasks) || response.tasks.length === 0) {
      throw new Error('Invalid DataForSEO response: no tasks found');
    }

    const firstTask = response.tasks[0];
    
    if (firstTask.status_code !== 20000) {
      throw new Error(`DataForSEO task failed: ${firstTask.status_message} (code: ${firstTask.status_code})`);
    }

    return firstTask.result || [];
  }


  /**
   * Calculates total cost from all tasks
   * @param response - DataForSEO API response
   * @returns Total cost from all tasks
   */
  static getTotalCost(response: DataForSEOResponse): number {
    if (!response?.tasks || !Array.isArray(response.tasks)) {
      return response?.cost || 0;
    }

    return response.tasks.reduce((total, task) => total + (task.cost || 0), 0);
  }

  /**
   * Validates DataForSEO response structure
   * @param response - DataForSEO API response
   * @returns Validation result
   */
  static validateResponse(response: DataForSEOResponse): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic structure
    if (!response) {
      errors.push('Response is null or undefined');
      return { isValid: false, errors, warnings };
    }

    if (response.status_code !== 20000) {
      errors.push(`API request failed: ${response.status_message} (code: ${response.status_code})`);
    }

    if (!response.tasks || !Array.isArray(response.tasks)) {
      errors.push('Missing or invalid tasks array');
      return { isValid: false, errors, warnings };
    }

    if (response.tasks.length === 0) {
      warnings.push('No tasks found in response');
    }

    // Check individual tasks
    for (let i = 0; i < response.tasks.length; i++) {
      const task = response.tasks[i];
      
      if (task.status_code !== 20000) {
        warnings.push(`Task ${i + 1} failed: ${task.status_message} (code: ${task.status_code})`);
      }

      if (!task.result || !Array.isArray(task.result)) {
        warnings.push(`Task ${i + 1} has no results`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extracts comprehensive response summary
   * @param response - DataForSEO API response
   * @returns Response summary with metadata
   */
  static getResponseSummary(response: DataForSEOResponse): {
    totalCost: number;
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    totalResults: number;
    responseTime?: string;
    warnings: string[];
  } {
    const validation = this.validateResponse(response);
    const tasks = response?.tasks || [];
    
    const successfulTasks = tasks.filter(task => task.status_code === 20000);
    const totalResults = successfulTasks.reduce((total, task) => 
      total + (task.result?.length || 0), 0
    );

    return {
      totalCost: this.getTotalCost(response),
      totalTasks: tasks.length,
      successfulTasks: successfulTasks.length,
      failedTasks: tasks.length - successfulTasks.length,
      totalResults,
      responseTime: response?.time,
      warnings: validation.warnings
    };
  }
}


// Export common extraction patterns
export const DataForSEOExtractors = {
  // For SERP results (multiple items expected) - Extract items from SERP results
  serpResults: (response: DataForSEOResponse) => {
    const results = DataForSEOResponseHandler.extractFirstTaskResults(response);
    if (results.length > 0 && results[0].items) {
      return results[0].items; // Return the actual SERP items (people_also_ask, organic, etc.)
    }
    return results;
  },
  
  // For keyword data (multiple items expected)
  keywordResults: (response: DataForSEOResponse) => 
    DataForSEOResponseHandler.extractFirstTaskResults(response),
};