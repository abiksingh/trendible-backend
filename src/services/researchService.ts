import { dataForSEOConfig } from '../config/dataForSEOConfig';
import { logInfo, logError } from '../utils/dataForSEOLogger';

export interface KeywordIntelligenceParams {
  keyword: string;
  location_code?: number;
  language_code?: string;
  source: string;
}

export interface KeywordIntelligenceResult {
  core_metrics: {
    search_volume: number;
    search_intent: {
      label: string;
      probability: number;
    };
    trend_volume: {
      latest_trend: string;
      direction: 'up' | 'down' | 'stable';
      period: 'monthly' | 'quarterly' | 'yearly' | 'stable';
      all_trends: {
        monthly?: number;
        quarterly?: number;
        yearly?: number;
      };
    };
    competition: {
      score: number;
      percentage: number;
      level: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    keyword_difficulty: {
      score: number;
      level: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    cost_per_click: {
      amount: number;
      currency: string;
    };
  };
  historical_volume: {
    data_points: Array<{
      month: string;
      year: number;
      search_volume: number;
    }>;
    data_range: {
      start_date: string;
      end_date: string;
      total_months: number;
    };
  };
  sources_queried: string[];
  total_cost: number;
}

// HTTP Client for DataForSEO API calls
const createHttpClient = () => {
  const baseURL = dataForSEOConfig.baseUrl;
  const auth = btoa(`${dataForSEOConfig.credentials.username}:${dataForSEOConfig.credentials.password}`);
  
  return {
    async post(endpoint: string, data: any) {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([data])
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    }
  };
};

// Phase 1: Core Metrics API Functions

export const getHistoricalKeywordData = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const client = createHttpClient();
    const data = {
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode
    };

    const result = await client.post('/v3/dataforseo_labs/google/historical_keyword_data/live', data);
    
    // Debug logging - full API response
    logInfo('Full historical keyword data API response', {
      keyword,
      status_code: result.status_code,
      status_message: result.status_message,
      full_result: JSON.stringify(result, null, 2)
    });
    
    if (result.status_code !== 20000) {
      throw new Error(`Historical keyword data API error: ${result.status_message}`);
    }

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    const cost = result.tasks?.[0]?.cost || 0;
    
    // Find keyword data - the API returns history array with keyword_info nested inside
    const keywordItem = items.find((item: any) => item.keyword === keyword);
    
    if (!keywordItem || !keywordItem.history || keywordItem.history.length === 0) {
      return {
        data: {},
        cost,
        processing_time: Date.now() - startTime
      };
    }

    // Get the most recent data (first item in history array)
    const latestData = keywordItem.history[0].keyword_info;

    return {
      data: {
        ...latestData,
        monthly_searches: latestData.monthly_searches || [],
        search_volume_trend: latestData.search_volume_trend || {}
      },
      cost,
      processing_time: Date.now() - startTime
    };
  } catch (error) {
    logError('Historical keyword data request failed', { keyword, error });
    throw error;
  }
};

export const getSearchIntent = async (keyword: string, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const client = createHttpClient();
    const data = {
      keywords: [keyword],
      language_code: languageCode
    };

    const result = await client.post('/v3/dataforseo_labs/google/search_intent/live', data);
    
    if (result.status_code !== 20000) {
      throw new Error(`Search intent API error: ${result.status_message}`);
    }

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    const cost = result.tasks?.[0]?.cost || 0;
    const keywordResult = items.find((item: any) => item.keyword === keyword);

    return {
      data: keywordResult || {},
      cost,
      processing_time: Date.now() - startTime
    };
  } catch (error) {
    logError('Search intent request failed', { keyword, error });
    throw error;
  }
};

export const getKeywordDifficultyScore = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const client = createHttpClient();
    const data = {
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode
    };

    const result = await client.post('/v3/dataforseo_labs/google/bulk_keyword_difficulty/live', data);
    
    if (result.status_code !== 20000) {
      throw new Error(`Keyword difficulty API error: ${result.status_message}`);
    }

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    const cost = result.tasks?.[0]?.cost || 0;
    const keywordResult = items.find((item: any) => item.keyword === keyword);

    return {
      data: keywordResult || {},
      cost,
      processing_time: Date.now() - startTime
    };
  } catch (error) {
    logError('Keyword difficulty request failed', { keyword, error });
    throw error;
  }
};

// Helper Functions

const getMonthName = (monthNumber: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || 'January';
};

const getCompetitionLevel = (percentage: number): 'LOW' | 'MEDIUM' | 'HIGH' => {
  if (percentage >= 70) return 'HIGH';
  if (percentage >= 40) return 'MEDIUM';
  return 'LOW';
};

const getDifficultyLevel = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' => {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
};


// Main Intelligence Function

export const getKeywordIntelligence = async (params: KeywordIntelligenceParams): Promise<KeywordIntelligenceResult> => {
  const { keyword, location_code = 2840, language_code = 'en', source } = params;
  
  logInfo('Starting keyword intelligence research (Google-focused)', {
    keyword,
    location_code,
    language_code,
    source
  });

  if (source !== 'google') {
    throw new Error('Only Google source is supported in this version');
  }

  let totalCost = 0;
  const sourcesQueried: string[] = ['google'];

  try {
    // Execute all three API calls in parallel for Phase 1: Core Metrics
    const [historicalData, searchIntentData, difficultyData] = await Promise.all([
      getHistoricalKeywordData(keyword, location_code, language_code),
      getSearchIntent(keyword, language_code),
      getKeywordDifficultyScore(keyword, location_code, language_code)
    ]);

    totalCost = historicalData.cost + searchIntentData.cost + difficultyData.cost;

    // Extract core metrics from API responses
    const historical = historicalData.data;
    const intent = searchIntentData.data;
    const difficulty = difficultyData.data;

    // Phase 1: Process Core Metrics

    // a) Avg. Monthly Search Volume (from past 12 months)
    const searchVolume = historical.search_volume || 0;

    // b) Search Intent
    const searchIntent = {
      label: intent.keyword_intent?.label || 'informational',
      probability: intent.keyword_intent?.probability || 0
    };

    // c) Trend Volume - get latest trend with period context
    const searchVolumeTrend = historical.search_volume_trend || {};
    let latestTrend = 'stable';
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    let trendPeriod: 'monthly' | 'quarterly' | 'yearly' | 'stable' = 'stable';
    
    // Check for trend data in priority order: monthly > quarterly > yearly
    if (searchVolumeTrend.monthly !== undefined && searchVolumeTrend.monthly !== 0) {
      latestTrend = searchVolumeTrend.monthly > 0 ? `+${searchVolumeTrend.monthly}%` : `${searchVolumeTrend.monthly}%`;
      trendDirection = searchVolumeTrend.monthly > 0 ? 'up' : 'down';
      trendPeriod = 'monthly';
    } else if (searchVolumeTrend.quarterly !== undefined && searchVolumeTrend.quarterly !== 0) {
      latestTrend = searchVolumeTrend.quarterly > 0 ? `+${searchVolumeTrend.quarterly}%` : `${searchVolumeTrend.quarterly}%`;
      trendDirection = searchVolumeTrend.quarterly > 0 ? 'up' : 'down';
      trendPeriod = 'quarterly';
    } else if (searchVolumeTrend.yearly !== undefined && searchVolumeTrend.yearly !== 0) {
      latestTrend = searchVolumeTrend.yearly > 0 ? `+${searchVolumeTrend.yearly}%` : `${searchVolumeTrend.yearly}%`;
      trendDirection = searchVolumeTrend.yearly > 0 ? 'up' : 'down';
      trendPeriod = 'yearly';
    }

    // d) Competition - convert to percentage and classify
    const competitionScore = historical.competition || 0;
    const competitionPercentage = Math.round(competitionScore * 100);
    const competitionLevel = getCompetitionLevel(competitionPercentage);

    // e) Keyword Difficulty - classify
    const difficultyScore = difficulty.keyword_difficulty || 0;
    const difficultyLevel = getDifficultyLevel(difficultyScore);

    // f) Cost per Click 
    const cpc = historical.cpc || 0;

    // Phase 2: Process Historical Volume Data
    const monthlySearches = historical.monthly_searches || [];
    const historyDataPoints = monthlySearches.map((item: any) => ({
      month: getMonthName(item.month || 1),
      year: item.year || new Date().getFullYear(),
      search_volume: item.search_volume || 0
    }));

    // Sort data points chronologically
    historyDataPoints.sort((a: { month: string; year: number; search_volume: number }, b: { month: string; year: number; search_volume: number }) => {
      if (a.year !== b.year) return a.year - b.year;
      const monthIndex = (month: string) => [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ].indexOf(month);
      return monthIndex(a.month) - monthIndex(b.month);
    });

    const dateRange = {
      start_date: monthlySearches.length > 0 ? `${monthlySearches[0]?.year || 2020}-${String(monthlySearches[0]?.month || 1).padStart(2, '0')}-01` : '',
      end_date: monthlySearches.length > 0 ? `${monthlySearches[monthlySearches.length - 1]?.year || 2024}-${String(monthlySearches[monthlySearches.length - 1]?.month || 12).padStart(2, '0')}-01` : '',
      total_months: monthlySearches.length
    };

    return {
      core_metrics: {
        search_volume: searchVolume,
        search_intent: searchIntent,
        trend_volume: {
          latest_trend: latestTrend.toString(),
          direction: trendDirection,
          period: trendPeriod,
          all_trends: {
            monthly: searchVolumeTrend.monthly,
            quarterly: searchVolumeTrend.quarterly,
            yearly: searchVolumeTrend.yearly
          }
        },
        competition: {
          score: competitionScore,
          percentage: competitionPercentage,
          level: competitionLevel
        },
        keyword_difficulty: {
          score: difficultyScore,
          level: difficultyLevel
        },
        cost_per_click: {
          amount: cpc,
          currency: 'USD'
        }
      },
      historical_volume: {
        data_points: historyDataPoints,
        data_range: dateRange
      },
      sources_queried: sourcesQueried,
      total_cost: totalCost
    };

  } catch (error) {
    logError('Keyword intelligence research failed', error);
    throw error;
  }

};