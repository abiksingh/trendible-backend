interface DataForSEOEndpoints {
  readonly SERP_BING_ORGANIC: string;
  readonly SERP_YOUTUBE_VIDEO: string;
}

interface RateLimits {
  readonly DEFAULT_REQUESTS_PER_MINUTE: number;
  readonly KEYWORDS_LIVE_REQUESTS_PER_MINUTE: number;
  readonly MAX_SIMULTANEOUS_REQUESTS: number;
}

interface APIDefaults {
  readonly LOCATION_CODE: number; // US
  readonly LANGUAGE_CODE: string; // English
  readonly DEVICE: string;
  readonly MAX_RESULTS: number;
  readonly TIMEOUT: number; // milliseconds
}

interface RetryConfig {
  readonly MAX_RETRIES: number;
  readonly BASE_DELAY: number; // milliseconds
}


class DataForSEOConfiguration {
  public readonly endpoints: DataForSEOEndpoints = {
    SERP_BING_ORGANIC: '/v3/serp/bing/organic/live/advanced',
    SERP_YOUTUBE_VIDEO: '/v3/serp/youtube/organic/live/advanced'
  };

  public readonly rateLimits: RateLimits = {
    DEFAULT_REQUESTS_PER_MINUTE: 2000,
    KEYWORDS_LIVE_REQUESTS_PER_MINUTE: 12,
    MAX_SIMULTANEOUS_REQUESTS: 30
  };

  public readonly defaults: APIDefaults = {
    LOCATION_CODE: 2840, // United States
    LANGUAGE_CODE: 'en', // English
    DEVICE: 'desktop',
    MAX_RESULTS: 100,
    TIMEOUT: 30000 // 30 seconds
  };

  public readonly retry: RetryConfig = {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000 // 1 second
  };


  public readonly baseUrl: string;
  public readonly credentials: {
    username: string;
    password: string;
  };
  public readonly environment: 'development' | 'production' | 'test';

  constructor() {
    this.validateEnvironmentVariables();
    
    this.baseUrl = process.env.DATAFORSEO_BASE_URL || 'https://api.dataforseo.com';
    
    // Use individual credentials
    this.credentials = {
      username: process.env.DATAFORSEO_USERNAME!,
      password: process.env.DATAFORSEO_PASSWORD!
    };
    
    this.environment = (process.env.NODE_ENV as any) || 'development';
  }

  private validateEnvironmentVariables(): void {
    // Check if we have individual credentials
    const hasCredentials = !!(process.env.DATAFORSEO_USERNAME && process.env.DATAFORSEO_PASSWORD);
    
    if (!hasCredentials) {
      throw new Error(
        'Missing DataForSEO credentials. Please provide both:\n' +
        '- DATAFORSEO_USERNAME\n' +
        '- DATAFORSEO_PASSWORD\n' +
        'Please check your .env.local file and ensure credentials are set.'
      );
    }
  }


  public getLocationOptions(): Array<{code: number, name: string, country: string}> {
    return [
      { code: 2840, name: 'United States', country: 'US' },
      { code: 2826, name: 'United Kingdom', country: 'GB' },
      { code: 2124, name: 'Canada', country: 'CA' },
      { code: 2036, name: 'Australia', country: 'AU' },
      { code: 2276, name: 'Germany', country: 'DE' },
      { code: 2250, name: 'France', country: 'FR' },
      { code: 2724, name: 'Spain', country: 'ES' },
      { code: 2380, name: 'Italy', country: 'IT' },
      { code: 2392, name: 'Japan', country: 'JP' },
      { code: 2356, name: 'India', country: 'IN' }
    ];
  }

  public getLanguageOptions(): Array<{code: string, name: string}> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'hi', name: 'Hindi' }
    ];
  }

  public getDeviceOptions(): string[] {
    return ['desktop', 'mobile', 'tablet'];
  }

  public getCostLimits(): { daily: number, monthly: number, alert: number } {
    return {
      daily: parseFloat(process.env.DATAFORSEO_DAILY_LIMIT || '10.00'),
      monthly: parseFloat(process.env.DATAFORSEO_MONTHLY_LIMIT || '100.00'),
      alert: parseFloat(process.env.DATAFORSEO_COST_ALERT || '5.00')
    };
  }
}

// Create singleton instance with lazy initialization
let _dataForSEOConfigInstance: DataForSEOConfiguration | null = null;

export const dataForSEOConfig = {
  get instance(): DataForSEOConfiguration {
    if (!_dataForSEOConfigInstance) {
      _dataForSEOConfigInstance = new DataForSEOConfiguration();
    }
    return _dataForSEOConfigInstance;
  }
};

// Export types for external use
export type {
  DataForSEOEndpoints,
  RateLimits,
  APIDefaults,
  RetryConfig
};