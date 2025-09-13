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
  const baseURL = dataForSEOConfig.instance.baseUrl;
  const auth = btoa(`${dataForSEOConfig.instance.credentials.username}:${dataForSEOConfig.instance.credentials.password}`);
  
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

export const getBingSearchVolume = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const client = createHttpClient();
    const data = {
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode
    };

    const result = await client.post('/v3/keywords_data/bing/search_volume/live', data);
    
    if (result.status_code !== 20000) {
      throw new Error(`Bing search volume API error: ${result.status_message}`);
    }

    // Bing API returns data directly in result[0], not nested in items
    const taskResult = result.tasks?.[0]?.result?.[0] || {};
    const cost = result.tasks?.[0]?.cost || 0;

    return {
      data: taskResult,
      cost,
      processing_time: Date.now() - startTime
    };
  } catch (error) {
    logError('Bing search volume request failed', { keyword, error });
    throw error;
  }
};

export const getBingKeywordDifficulty = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const client = createHttpClient();
    const data = {
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode
    };

    const result = await client.post('/v3/dataforseo_labs/bing/bulk_keyword_difficulty/live', data);
    
    if (result.status_code !== 20000) {
      throw new Error(`Bing keyword difficulty API error: ${result.status_message}`);
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
    logError('Bing keyword difficulty request failed', { keyword, error });
    throw error;
  }
};

// Enhanced Analytics API Functions

export const getClickstreamSearchVolume = async (keyword: string, locationCode?: number, languageCode?: string) => {
  const startTime = Date.now();
  
  try {
    const client = createHttpClient();
    const data: any = {
      keywords: [keyword]
    };
    
    if (locationCode) data.location_code = locationCode;
    if (languageCode) data.language_code = languageCode;

    const result = await client.post('/v3/keywords_data/clickstream_data/dataforseo_search_volume/live', data);
    
    logInfo('Clickstream search volume API response', {
      keyword,
      status_code: result.status_code,
      status_message: result.status_message
    });
    
    if (result.status_code !== 20000) {
      throw new Error(`Clickstream search volume API error: ${result.status_message}`);
    }

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    const cost = result.tasks?.[0]?.cost || 0;
    const keywordResult = items.find((item: any) => item.keyword === keyword) || {};

    return {
      data: keywordResult,
      cost,
      processing_time: Date.now() - startTime
    };
  } catch (error) {
    logError('Clickstream search volume request failed', { keyword, error });
    throw error;
  }
};

export const getGlobalSearchVolume = async (keyword: string) => {
  const startTime = Date.now();
  
  try {
    const client = createHttpClient();
    const data = {
      keywords: [keyword]
    };

    const result = await client.post('/v3/keywords_data/clickstream_data/global_search_volume/live', data);
    
    logInfo('Global search volume API response', {
      keyword,
      status_code: result.status_code,
      status_message: result.status_message
    });
    
    if (result.status_code !== 20000) {
      throw new Error(`Global search volume API error: ${result.status_message}`);
    }

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    const cost = result.tasks?.[0]?.cost || 0;
    const keywordResult = items.find((item: any) => item.keyword === keyword) || {};

    return {
      data: keywordResult,
      cost,
      processing_time: Date.now() - startTime
    };
  } catch (error) {
    logError('Global search volume request failed', { keyword, error });
    throw error;
  }
};

export const getDemographicData = async (keyword: string, locationName?: string) => {
  const startTime = Date.now();
  
  try {
    const client = createHttpClient();
    const data: any = {
      keywords: [keyword],
      type: 'web'
    };
    
    if (locationName) data.location_name = locationName;

    const result = await client.post('/v3/keywords_data/dataforseo_trends/demography/live', data);
    
    logInfo('Demographic data API response', {
      keyword,
      status_code: result.status_code,
      status_message: result.status_message
    });
    
    if (result.status_code !== 20000) {
      throw new Error(`Demographic data API error: ${result.status_message}`);
    }

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    const cost = result.tasks?.[0]?.cost || 0;
    
    // Find the first item with demography data since it contains data for all keywords
    const demographyItem = items.find((item: any) => item.demography) || {};

    return {
      data: demographyItem,
      cost,
      processing_time: Date.now() - startTime
    };
  } catch (error) {
    logError('Demographic data request failed', { keyword, error });
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

const calculateBingTrends = (monthlySearches: any[]) => {
  if (!monthlySearches || monthlySearches.length < 2) {
    return {
      monthly: null,
      quarterly: null,
      yearly: null
    };
  }

  const trends: any = {};

  // Monthly trend (last month vs previous month)
  if (monthlySearches.length >= 2) {
    const lastMonth = monthlySearches[monthlySearches.length - 1]?.search_volume || 0;
    const prevMonth = monthlySearches[monthlySearches.length - 2]?.search_volume || 0;
    
    if (prevMonth > 0) {
      trends.monthly = Math.round(((lastMonth - prevMonth) / prevMonth) * 100);
    }
  }

  // Quarterly trend (last 3 months vs previous 3 months)
  if (monthlySearches.length >= 6) {
    const lastQuarter = monthlySearches.slice(-3);
    const prevQuarter = monthlySearches.slice(-6, -3);
    
    const lastQuarterAvg = lastQuarter.reduce((sum, item) => sum + (item.search_volume || 0), 0) / 3;
    const prevQuarterAvg = prevQuarter.reduce((sum, item) => sum + (item.search_volume || 0), 0) / 3;
    
    if (prevQuarterAvg > 0) {
      trends.quarterly = Math.round(((lastQuarterAvg - prevQuarterAvg) / prevQuarterAvg) * 100);
    }
  }

  // Yearly trend (only if 12+ months available)
  if (monthlySearches.length >= 12) {
    const lastYear = monthlySearches.slice(-12);
    const prevYear = monthlySearches.length >= 24 ? monthlySearches.slice(-24, -12) : null;
    
    if (prevYear) {
      const lastYearTotal = lastYear.reduce((sum, item) => sum + (item.search_volume || 0), 0);
      const prevYearTotal = prevYear.reduce((sum, item) => sum + (item.search_volume || 0), 0);
      
      if (prevYearTotal > 0) {
        trends.yearly = Math.round(((lastYearTotal - prevYearTotal) / prevYearTotal) * 100);
      }
    }
  }

  return trends;
};


// Enhanced Analytics Types
export interface KeywordEnhancedAnalyticsParams {
  keyword: string;
  location_code?: number;
  language_code?: string;
  location_name?: string;
}

export interface KeywordEnhancedAnalyticsResult {
  search_volume_data: {
    avg_monthly_search: number;
    historical_data: Array<{
      month: string;
      year: number;
      search_volume: number;
    }>;
  };
  global_distribution: {
    total_volume: number;
    countries: Array<{
      country_name: string;
      country_iso_code: string;
      search_volume: number;
      percentage: number;
    }>;
  };
  demographics: {
    age_distribution: {
      "18-24": number;
      "25-34": number;
      "35-44": number;
      "45-54": number;
      "55-64": number;
    };
    gender_distribution: {
      male: number;
      female: number;
    };
  };
  sources_queried: string[];
  total_cost: number;
}

// Country ISO to Name Mapping
const getCountryName = (isoCode: string): string => {
  const countryMap: { [key: string]: string } = {
    'US': 'United States',
    'IN': 'India',
    'TR': 'Turkey',
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'BR': 'Brazil',
    'CA': 'Canada',
    'AU': 'Australia',
    'JP': 'Japan',
    'KR': 'South Korea',
    'CN': 'China',
    'RU': 'Russia',
    'IT': 'Italy',
    'ES': 'Spain',
    'MX': 'Mexico',
    'NL': 'Netherlands',
    'PL': 'Poland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'BE': 'Belgium',
    'IE': 'Ireland',
    'PT': 'Portugal',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'GR': 'Greece',
    'IL': 'Israel',
    'ZA': 'South Africa',
    'EG': 'Egypt',
    'NG': 'Nigeria',
    'SA': 'Saudi Arabia',
    'AE': 'United Arab Emirates',
    'TH': 'Thailand',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'PH': 'Philippines',
    'VN': 'Vietnam',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'PE': 'Peru',
    'VE': 'Venezuela',
    'UA': 'Ukraine',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'HR': 'Croatia',
    'SI': 'Slovenia',
    'SK': 'Slovakia',
    'LT': 'Lithuania',
    'LV': 'Latvia',
    'EE': 'Estonia'
  };
  
  return countryMap[isoCode] || isoCode;
};

// Enhanced Analytics Function
export const getKeywordEnhancedAnalytics = async (params: KeywordEnhancedAnalyticsParams): Promise<KeywordEnhancedAnalyticsResult> => {
  const { keyword, location_code = 2840, language_code = 'en', location_name = 'United States' } = params;
  
  logInfo('Starting enhanced keyword analytics research', {
    keyword,
    location_code,
    language_code,
    location_name
  });

  let totalCost = 0;
  const sourcesQueried: string[] = ['clickstream_search_volume', 'global_search_volume', 'demographic_trends'];

  try {
    // Execute all three API calls in parallel
    const [searchVolumeData, globalVolumeData, demographicData] = await Promise.all([
      getClickstreamSearchVolume(keyword, location_code, language_code),
      getGlobalSearchVolume(keyword),
      getDemographicData(keyword, location_name)
    ]);

    totalCost = searchVolumeData.cost + globalVolumeData.cost + demographicData.cost;

    // Process search volume data
    const searchVolume = searchVolumeData.data.search_volume || 0;
    const monthlySearches = searchVolumeData.data.monthly_searches || [];
    
    const historicalData = monthlySearches.map((item: any) => ({
      month: getMonthName(item.month || 1),
      year: item.year || new Date().getFullYear(),
      search_volume: item.search_volume || 0
    }));

    // Sort historical data chronologically
    historicalData.sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year;
      const monthIndex = (month: string) => [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ].indexOf(month);
      return monthIndex(a.month) - monthIndex(b.month);
    });

    // Process global distribution data
    const totalVolume = globalVolumeData.data.search_volume || 0;
    const countryDistribution = globalVolumeData.data.country_distribution || [];
    
    // Get top 10 countries by percentage
    const topCountries = countryDistribution
      .slice(0, 10)
      .map((country: any) => ({
        country_name: getCountryName(country.country_iso_code),
        country_iso_code: country.country_iso_code,
        search_volume: country.search_volume || 0,
        percentage: country.percentage || 0
      }));

    // Process demographic data
    const demography = demographicData.data.demography || {};
    const ageData = demography.age || [];
    const genderData = demography.gender || [];

    // Parse age data from DataForSEO format
    const ageDistribution = {
      "18-24": 0,
      "25-34": 0,
      "35-44": 0,
      "45-54": 0,
      "55-64": 0
    };

    if (ageData.length > 0) {
      const keywordAgeData = ageData.find((item: any) => item.keyword === keyword);
      if (keywordAgeData && keywordAgeData.values) {
        keywordAgeData.values.forEach((ageItem: any) => {
          if (ageDistribution.hasOwnProperty(ageItem.type)) {
            ageDistribution[ageItem.type as keyof typeof ageDistribution] = ageItem.value || 0;
          }
        });
      }
    }

    // Parse gender data from DataForSEO format  
    const genderDistribution = {
      male: 0,
      female: 0
    };

    if (genderData.length > 0) {
      const keywordGenderData = genderData.find((item: any) => item.keyword === keyword);
      if (keywordGenderData && keywordGenderData.values) {
        keywordGenderData.values.forEach((genderItem: any) => {
          if (genderItem.type === 'male') {
            genderDistribution.male = genderItem.value || 0;
          } else if (genderItem.type === 'female') {
            genderDistribution.female = genderItem.value || 0;
          }
        });
      }
    }

    return {
      search_volume_data: {
        avg_monthly_search: searchVolume,
        historical_data: historicalData
      },
      global_distribution: {
        total_volume: totalVolume,
        countries: topCountries
      },
      demographics: {
        age_distribution: ageDistribution,
        gender_distribution: genderDistribution
      },
      sources_queried: sourcesQueried,
      total_cost: totalCost
    };

  } catch (error) {
    logError('Enhanced keyword analytics research failed', error);
    throw error;
  }
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

  let totalCost = 0;
  const sourcesQueried: string[] = [source];

  try {
    if (source === 'google') {
      // Execute all three API calls in parallel for Google
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

    } else if (source === 'bing') {
      // Execute Bing API calls in parallel (reuse Google search intent)
      const [bingVolumeData, bingDifficultyData, googleIntentData] = await Promise.all([
        getBingSearchVolume(keyword, location_code, language_code),
        getBingKeywordDifficulty(keyword, location_code, language_code),
        getSearchIntent(keyword, language_code) // Reuse Google intent
      ]);

      totalCost = bingVolumeData.cost + bingDifficultyData.cost + googleIntentData.cost;

      // Extract Bing metrics
      const bingVolume = bingVolumeData.data;
      const bingDifficulty = bingDifficultyData.data;
      const intent = googleIntentData.data;

      // Process Bing core metrics
      const searchVolume = bingVolume.search_volume || 0;
      
      // Search Intent (reused from Google)
      const searchIntent = {
        label: intent.keyword_intent?.label || 'informational',
        probability: intent.keyword_intent?.probability || 0
      };

      // Calculate Bing trends manually
      const monthlySearches = bingVolume.monthly_searches || [];
      const calculatedTrends = calculateBingTrends(monthlySearches);
      
      // Determine latest trend priority: monthly > quarterly > yearly
      let latestTrend = 'stable';
      let trendDirection: 'up' | 'down' | 'stable' = 'stable';
      let trendPeriod: 'monthly' | 'quarterly' | 'yearly' | 'stable' = 'stable';
      
      if (calculatedTrends.monthly !== null && calculatedTrends.monthly !== 0) {
        latestTrend = calculatedTrends.monthly > 0 ? `+${calculatedTrends.monthly}%` : `${calculatedTrends.monthly}%`;
        trendDirection = calculatedTrends.monthly > 0 ? 'up' : 'down';
        trendPeriod = 'monthly';
      } else if (calculatedTrends.quarterly !== null && calculatedTrends.quarterly !== 0) {
        latestTrend = calculatedTrends.quarterly > 0 ? `+${calculatedTrends.quarterly}%` : `${calculatedTrends.quarterly}%`;
        trendDirection = calculatedTrends.quarterly > 0 ? 'up' : 'down';
        trendPeriod = 'quarterly';
      } else if (calculatedTrends.yearly !== null && calculatedTrends.yearly !== 0) {
        latestTrend = calculatedTrends.yearly > 0 ? `+${calculatedTrends.yearly}%` : `${calculatedTrends.yearly}%`;
        trendDirection = calculatedTrends.yearly > 0 ? 'up' : 'down';
        trendPeriod = 'yearly';
      }

      // Competition and difficulty processing (same logic as Google)
      const competitionScore = bingVolume.competition || 0;
      const competitionPercentage = Math.round(competitionScore * 100);
      const competitionLevel = getCompetitionLevel(competitionPercentage);
      
      const difficultyScore = bingDifficulty.keyword_difficulty || 0;
      const difficultyLevel = getDifficultyLevel(difficultyScore);
      
      const cpc = bingVolume.cpc || 0;

      // Process historical volume data (same logic as Google)
      const historyDataPoints = monthlySearches.map((item: any) => ({
        month: getMonthName(item.month || 1),
        year: item.year || new Date().getFullYear(),
        search_volume: item.search_volume || 0
      }));

      // Sort chronologically (same logic as Google)
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
            latest_trend: latestTrend,
            direction: trendDirection,
            period: trendPeriod,
            all_trends: {
              monthly: calculatedTrends.monthly,
              quarterly: calculatedTrends.quarterly,
              yearly: calculatedTrends.yearly
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
    
    } else {
      throw new Error(`Unsupported source: ${source}. Only 'google' and 'bing' are supported.`);
    }

  } catch (error) {
    logError('Keyword intelligence research failed', error);
    throw error;
  }

};