interface DataForSEOEndpoints {
  readonly SERP_GOOGLE_ORGANIC: string;
  readonly SERP_GOOGLE_PAID: string;
  readonly SERP_BING_ORGANIC: string;
  readonly SERP_YAHOO_ORGANIC: string;
  readonly SERP_YOUTUBE_VIDEO: string;
  readonly KEYWORDS_GOOGLE_ADS: string;
  readonly KEYWORDS_SUGGESTIONS: string;
  readonly KEYWORDS_DIFFICULTY: string;
  readonly AMAZON_PRODUCTS: string;
  readonly AMAZON_SEARCH_VOLUME: string;
  readonly SOCIAL_MEDIA_LIVE: string;
  readonly CLICKSTREAM_SEARCH_VOLUME: string;
  readonly DEMOGRAPHIC_DATA: string;
  readonly LLM_CHATGPT: string;
  readonly LLM_CLAUDE: string;
  readonly BACKLINKS_OVERVIEW: string;
  readonly BACKLINKS_BULK: string;
  readonly DOMAIN_ANALYTICS_OVERVIEW: string;
  readonly DOMAIN_ANALYTICS_TECH: string;
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
  readonly MAX_DELAY: number; // milliseconds
  readonly BACKOFF_MULTIPLIER: number;
}

interface CacheConfig {
  readonly SERP_CACHE_TTL: number; // seconds
  readonly KEYWORDS_CACHE_TTL: number; // seconds
  readonly BACKLINKS_CACHE_TTL: number; // seconds
  readonly DOMAIN_CACHE_TTL: number; // seconds
}

class DataForSEOConfiguration {
  public readonly endpoints: DataForSEOEndpoints = {
    SERP_GOOGLE_ORGANIC: '/v3/serp/google/organic/live/advanced',
    SERP_GOOGLE_PAID: '/v3/serp/google/paid/live/advanced',
    SERP_BING_ORGANIC: '/v3/serp/bing/organic/live/advanced',
    SERP_YAHOO_ORGANIC: '/v3/serp/yahoo/organic/live/advanced',
    SERP_YOUTUBE_VIDEO: '/v3/serp/youtube/organic/live/advanced',
    KEYWORDS_GOOGLE_ADS: '/v3/keywords_data/google_ads/keywords_for_keywords/live',
    KEYWORDS_SUGGESTIONS: '/v3/dataforseo_labs/google/keyword_suggestions/live',
    KEYWORDS_DIFFICULTY: '/v3/dataforseo_labs/google/bulk_keyword_difficulty/live',
    AMAZON_PRODUCTS: '/v3/merchant/amazon/products/live/advanced',
    AMAZON_SEARCH_VOLUME: '/v3/dataforseo_labs/amazon/bulk_search_volume/live',
    SOCIAL_MEDIA_LIVE: '/v3/business_data/social_media/live',
    CLICKSTREAM_SEARCH_VOLUME: '/v3/keywords_data/clickstream_data/search_volume/live',
    DEMOGRAPHIC_DATA: '/v3/dataforseo_labs/google/categories_for_domain/live',
    LLM_CHATGPT: '/v3/content_generation/generate/live',
    LLM_CLAUDE: '/v3/content_analysis/ai_overview/live',
    BACKLINKS_OVERVIEW: '/v3/backlinks/summary/live',
    BACKLINKS_BULK: '/v3/backlinks/bulk_backlinks/live',
    DOMAIN_ANALYTICS_OVERVIEW: '/v3/domain_analytics/google/organic/overview/live',
    DOMAIN_ANALYTICS_TECH: '/v3/domain_analytics/technologies/domain_technologies/live'
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
    BASE_DELAY: 1000, // 1 second
    MAX_DELAY: 10000, // 10 seconds
    BACKOFF_MULTIPLIER: 2
  };

  public readonly cache: CacheConfig = {
    SERP_CACHE_TTL: 3600, // 1 hour
    KEYWORDS_CACHE_TTL: 86400, // 24 hours
    BACKLINKS_CACHE_TTL: 43200, // 12 hours
    DOMAIN_CACHE_TTL: 21600 // 6 hours
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
    
    // Support both individual credentials and Base64 format
    if (process.env.DATAFORSEO_BASE64) {
      const decoded = Buffer.from(process.env.DATAFORSEO_BASE64, 'base64').toString('utf-8');
      const [username, password] = decoded.split(':');
      this.credentials = { username, password };
    } else {
      this.credentials = {
        username: process.env.DATAFORSEO_USERNAME!,
        password: process.env.DATAFORSEO_PASSWORD!
      };
    }
    
    this.environment = (process.env.NODE_ENV as any) || 'development';
  }

  private validateEnvironmentVariables(): void {
    // Check if we have Base64 credentials OR individual credentials
    const hasBase64 = !!process.env.DATAFORSEO_BASE64;
    const hasIndividual = !!(process.env.DATAFORSEO_USERNAME && process.env.DATAFORSEO_PASSWORD);
    
    if (!hasBase64 && !hasIndividual) {
      throw new Error(
        'Missing DataForSEO credentials. Please provide either:\n' +
        '- DATAFORSEO_BASE64 (Base64 encoded login:password)\n' +
        '- OR both DATAFORSEO_USERNAME and DATAFORSEO_PASSWORD\n' +
        'Please check your .env file and ensure credentials are set.'
      );
    }
  }

  public isDevelopment(): boolean {
    return this.environment === 'development';
  }

  public isProduction(): boolean {
    return this.environment === 'production';
  }

  public isTest(): boolean {
    return this.environment === 'test';
  }

  public getFullEndpointUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
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

// Create singleton instance
export const dataForSEOConfig = new DataForSEOConfiguration();

// Export types for external use
export type {
  DataForSEOEndpoints,
  RateLimits,
  APIDefaults,
  RetryConfig,
  CacheConfig
};