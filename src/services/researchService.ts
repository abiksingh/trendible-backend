import { getKeywordData, searchGoogleOrganic } from './dataForSEOFunctional';
import { DataForSEOExtractors, DataForSEOResponseHandler } from '../utils/dataForSEOResponseHandler';
import { logInfo, logError, logWarn } from '../utils/dataForSEOLogger';
import { dataForSEOConfig } from '../config/dataForSEOConfig';
import { withRetry, handleApiError } from '../utils/dataForSEOErrorHandlers';

export interface KeywordIntelligenceParams {
  keyword: string;
  location_code?: number;
  language_code?: string;
  sources?: string[];
}

export interface KeywordIntelligenceResult {
  search_engines: {
    google?: GoogleKeywordData;
  };
  summary: KeywordSummary;
  sources_queried: string[];
  total_cost: number;
}

export interface GoogleKeywordData {
  search_volume: number;
  competition: number;
  cpc: number;
  competition_level: string;
  monthly_searches: any[];
  serp_features: string[];
  intent: string;
  trend: string;
}

export interface KeywordSummary {
  total_volume: number;
  best_platform: string;
  overall_competition: string;
  recommended_strategy: string;
}

export const getKeywordIntelligence = async (params: KeywordIntelligenceParams): Promise<KeywordIntelligenceResult> => {
  const { keyword, location_code = 2840, language_code = 'en', sources = ['google'] } = params;
  
  logInfo('Starting keyword intelligence research', {
    keyword,
    location_code,
    language_code,
    sources
  });

  let totalCost = 0;
  const sourcesQueried: string[] = [];
  const searchEngines: any = {};

  try {
    // Google Search Engine Data (if requested)
    if (sources.includes('google') || sources.includes('all')) {
      try {
        const googleData = await getGoogleKeywordData(keyword, location_code, language_code);
        searchEngines.google = googleData.data;
        totalCost += googleData.cost;
        sourcesQueried.push('google');
      } catch (error) {
        logWarn('Google data unavailable for keyword intelligence', { error });
      }
    }

    // Bing Search Engine Data (if requested)
    if (sources.includes('bing') || sources.includes('all')) {
      try {
        const bingData = await getBingKeywordData(keyword, location_code, language_code);
        searchEngines.bing = bingData.data;
        totalCost += bingData.cost;
        sourcesQueried.push('bing');
      } catch (error) {
        logWarn('Bing data unavailable for keyword intelligence', { error });
      }
    }

    // YouTube Data (if requested)
    if (sources.includes('youtube') || sources.includes('all')) {
      try {
        const youtubeData = await getYouTubeKeywordData(keyword, location_code, language_code);
        searchEngines.youtube = youtubeData.data;
        totalCost += youtubeData.cost;
        sourcesQueried.push('youtube');
      } catch (error) {
        logWarn('YouTube data unavailable for keyword intelligence', { error });
      }
    }

    // Generate summary insights
    const summary = generateKeywordSummary(searchEngines, keyword);

    return {
      search_engines: searchEngines,
      summary,
      sources_queried: sourcesQueried,
      total_cost: totalCost
    };

  } catch (error) {
    logError('Keyword intelligence research failed', error);
    throw error;
  }
};

export const getGoogleKeywordData = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    // Get keyword metrics data
    const keywordResponse = await getKeywordData({
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode
    });

    const keywordResults = DataForSEOExtractors.keywordResults(keywordResponse);
    const keywordSummary = DataForSEOResponseHandler.getResponseSummary(keywordResponse);

    // Get SERP data for additional insights
    let serpFeatures: string[] = [];
    let intent = 'unknown';
    
    try {
      const serpResponse = await searchGoogleOrganic({
        keyword,
        location_code: locationCode,
        language_code: languageCode
      });

      const serpResults = DataForSEOExtractors.serpResults(serpResponse);
      
      // Analyze SERP features
      serpFeatures = analyzeSerpFeatures(serpResults);
      intent = determineSearchIntent(serpResults, keyword);
      
    } catch (serpError) {
      logWarn('SERP data unavailable for keyword analysis', { error: serpError });
    }

    // Process keyword data
    const keywordData = keywordResults[0] || {};
    
    return {
      data: {
        search_volume: keywordData.search_volume || 0,
        competition: keywordData.competition || 0,
        cpc: keywordData.cpc || 0,
        competition_level: keywordData.competition_level || 'unknown',
        monthly_searches: keywordData.monthly_searches || [],
        serp_features: serpFeatures,
        intent: intent,
        trend: calculateTrend(keywordData.monthly_searches || [])
      },
      cost: keywordSummary.totalCost,
      response_time: Date.now() - startTime
    };

  } catch (error) {
    logError('Google keyword data extraction failed', error);
    throw error;
  }
};

export const analyzeSerpFeatures = (serpResults: any[]): string[] => {
  const features: string[] = [];
  
  for (const result of serpResults) {
    if (result.type === 'people_also_ask') features.push('people_also_ask');
    if (result.type === 'knowledge_graph') features.push('knowledge_graph');
    if (result.type === 'featured_snippet') features.push('featured_snippet');
    if (result.type === 'local_pack') features.push('local_pack');
    if (result.type === 'shopping') features.push('shopping');
    if (result.type === 'images') features.push('images');
    if (result.type === 'videos') features.push('videos');
  }

  return [...new Set(features)]; // Remove duplicates
};

export const determineSearchIntent = (serpResults: any[], keyword: string): string => {
  const keywordLower = keyword.toLowerCase();
  
  // Commercial intent keywords
  if (keywordLower.includes('buy') || keywordLower.includes('purchase') || 
      keywordLower.includes('price') || keywordLower.includes('cost')) {
    return 'commercial';
  }

  // Transactional intent keywords
  if (keywordLower.includes('download') || keywordLower.includes('signup') ||
      keywordLower.includes('subscribe') || keywordLower.includes('free trial')) {
    return 'transactional';
  }

  // Navigational intent keywords
  if (keywordLower.includes('login') || keywordLower.includes('website') ||
      keywordLower.includes('official site')) {
    return 'navigational';
  }

  // Analyze SERP results for intent clues
  const hasShoppingResults = serpResults.some(r => r.type === 'shopping');
  const hasLocalResults = serpResults.some(r => r.type === 'local_pack');
  
  if (hasShoppingResults) return 'commercial';
  if (hasLocalResults) return 'local';

  // Default to informational
  return 'informational';
};

export const calculateTrend = (monthlySearches: any[]): string => {
  if (!monthlySearches || monthlySearches.length < 2) return 'no data';

  const recent = monthlySearches.slice(-3); // Last 3 months
  const older = monthlySearches.slice(-6, -3); // 3 months before that

  if (recent.length === 0 || older.length === 0) return 'no data';

  const recentAvg = recent.reduce((sum, item) => sum + (item.search_volume || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, item) => sum + (item.search_volume || 0), 0) / older.length;

  if (olderAvg === 0) return 'no data';

  const change = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (change > 10) return `+${Math.round(change)}%`;
  if (change < -10) return `${Math.round(change)}%`;
  return 'stable';
};

// Bing Search Engine Functions
export const getBingKeywordData = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const data = [{
      keyword,
      location_code: locationCode,
      language_code: languageCode
    }];

    // Create HTTP client (reusing pattern from dataForSEOSimple.ts)
    const baseURL = dataForSEOConfig.baseUrl;
    const auth = btoa(`${dataForSEOConfig.credentials.username}:${dataForSEOConfig.credentials.password}`);
    
    const response = await fetch(`${baseURL}${dataForSEOConfig.endpoints.SERP_BING_ORGANIC}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const serpResults = DataForSEOExtractors.serpResults(result);
    const responseSummary = DataForSEOResponseHandler.getResponseSummary(result);

    return {
      data: {
        search_volume: 0, // Bing doesn't provide direct volume in SERP
        results: serpResults,
        total_results: serpResults.length,
        serp_features: analyzeSerpFeatures(serpResults),
        intent: determineSearchIntent(serpResults, keyword),
        platform: 'bing'
      },
      cost: responseSummary.totalCost,
      response_time: Date.now() - startTime
    };

  } catch (error) {
    logError('Bing keyword data extraction failed', error);
    throw error;
  }
};

// YouTube Video Search Functions  
export const getYouTubeKeywordData = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const data = [{
      keyword,
      location_code: locationCode,
      language_code: languageCode
    }];

    const baseURL = dataForSEOConfig.baseUrl;
    const auth = btoa(`${dataForSEOConfig.credentials.username}:${dataForSEOConfig.credentials.password}`);
    
    const response = await fetch(`${baseURL}${dataForSEOConfig.endpoints.SERP_YOUTUBE_VIDEO}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const videoResults = DataForSEOExtractors.serpResults(result);
    const responseSummary = DataForSEOResponseHandler.getResponseSummary(result);

    return {
      data: {
        video_count: videoResults.length,
        videos: videoResults.slice(0, 10), // Top 10 videos
        engagement_metrics: analyzeVideoEngagement(videoResults),
        content_themes: analyzeVideoThemes(videoResults, keyword),
        platform: 'youtube'
      },
      cost: responseSummary.totalCost,
      response_time: Date.now() - startTime
    };

  } catch (error) {
    logError('YouTube keyword data extraction failed', error);
    throw error;
  }
};

// Search Engine Comparison Function
export const compareSearchEngines = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  const comparisons: any = {};
  let totalCost = 0;

  try {
    // Get Google data
    try {
      const googleData = await getGoogleKeywordData(keyword, locationCode, languageCode);
      comparisons.google = googleData.data;
      totalCost += googleData.cost;
    } catch (error) {
      comparisons.google = { error: 'Data unavailable' };
    }

    // Get Bing data
    try {
      const bingData = await getBingKeywordData(keyword, locationCode, languageCode);
      comparisons.bing = bingData.data;
      totalCost += bingData.cost;
    } catch (error) {
      comparisons.bing = { error: 'Data unavailable' };
    }

    // Generate comparison insights
    const insights = generateComparisonInsights(comparisons, keyword);

    return {
      keyword,
      platforms: comparisons,
      insights,
      total_cost: totalCost,
      response_time: Date.now() - startTime
    };

  } catch (error) {
    logError('Search engine comparison failed', error);
    throw error;
  }
};

// Helper Functions
const analyzeVideoEngagement = (videoResults: any[]): any => {
  if (!videoResults || videoResults.length === 0) {
    return { average_views: 0, high_engagement_count: 0 };
  }

  let totalViews = 0;
  let highEngagementCount = 0;

  for (const video of videoResults) {
    const views = video.views_count || 0;
    totalViews += views;
    if (views > 100000) highEngagementCount++; // 100k+ views considered high engagement
  }

  return {
    average_views: Math.round(totalViews / videoResults.length),
    high_engagement_count: highEngagementCount,
    total_videos_analyzed: videoResults.length
  };
};

const analyzeVideoThemes = (videoResults: any[], keyword: string): string[] => {
  const themes: string[] = [];
  const keywordLower = keyword.toLowerCase();

  for (const video of videoResults) {
    const title = (video.title || '').toLowerCase();
    
    if (title.includes('tutorial') || title.includes('how to')) themes.push('educational');
    if (title.includes('review') || title.includes('comparison')) themes.push('review');
    if (title.includes('beginner') || title.includes('basics')) themes.push('beginner');
    if (title.includes('advanced') || title.includes('expert')) themes.push('advanced');
    if (title.includes('2024') || title.includes('2025')) themes.push('current');
  }

  return [...new Set(themes)]; // Remove duplicates
};

const generateComparisonInsights = (comparisons: any, keyword: string): any => {
  const insights: any = {
    recommendations: [],
    key_differences: []
  };

  const googleData = comparisons.google;
  const bingData = comparisons.bing;

  // Compare search volumes if available
  if (googleData?.search_volume && bingData?.search_volume) {
    const googleVolume = googleData.search_volume;
    const bingVolume = bingData.search_volume;
    
    if (googleVolume > bingVolume * 2) {
      insights.recommendations.push('Focus primary SEO efforts on Google');
      insights.key_differences.push(`Google has ${Math.round((googleVolume / bingVolume) * 100) - 100}% higher search volume`);
    } else if (bingVolume > googleVolume) {
      insights.recommendations.push('Consider Bing optimization - competitive advantage');
      insights.key_differences.push('Bing shows higher or comparable search interest');
    }
  }

  // Compare competition levels
  if (googleData?.competition !== undefined && bingData?.competition !== undefined) {
    if (googleData.competition > bingData.competition + 0.3) {
      insights.recommendations.push('Bing may offer easier ranking opportunities');
      insights.key_differences.push('Significantly less competition on Bing');
    }
  }

  // Compare SERP features
  const googleFeatures = googleData?.serp_features || [];
  const bingFeatures = bingData?.serp_features || [];
  
  if (googleFeatures.length > bingFeatures.length) {
    insights.key_differences.push('Google shows more SERP features');
  }

  return insights;
};

export const generateKeywordSummary = (searchEngines: any, keyword: string): KeywordSummary => {
  let totalVolume = 0;
  let bestPlatform = 'unknown';
  let overallCompetition = 'unknown';

  // Analyze Google data if available
  if (searchEngines.google) {
    totalVolume += searchEngines.google.search_volume || 0;
    bestPlatform = 'google';
    
    const competition = searchEngines.google.competition || 0;
    if (competition > 0.7) overallCompetition = 'high';
    else if (competition > 0.4) overallCompetition = 'medium';
    else overallCompetition = 'low';
  }

  // Consider Bing data for comparison
  if (searchEngines.bing) {
    const bingResultCount = searchEngines.bing.total_results || 0;
    // If Bing has significantly more results, might indicate opportunity
    if (bingResultCount > totalVolume && totalVolume > 0) {
      bestPlatform = 'multi-platform';
    } else if (totalVolume === 0 && bingResultCount > 0) {
      bestPlatform = 'bing';
    }
  }

  // Consider YouTube data
  if (searchEngines.youtube) {
    const videoCount = searchEngines.youtube.video_count || 0;
    if (videoCount > 100) {
      if (bestPlatform === 'unknown') {
        bestPlatform = 'youtube';
      } else {
        bestPlatform = 'multi-platform';
      }
    }
  }

  // Generate strategy recommendation
  let recommendedStrategy = 'focus on content quality';
  
  if (overallCompetition === 'high') {
    recommendedStrategy = 'target long-tail variations';
  } else if (overallCompetition === 'low' && totalVolume > 1000) {
    recommendedStrategy = 'opportunity for quick wins';
  } else if (totalVolume < 100) {
    recommendedStrategy = 'consider broader keyword variants';
  }

  // Multi-platform strategy
  if (bestPlatform === 'multi-platform') {
    recommendedStrategy = 'diversify across multiple platforms';
  }

  return {
    total_volume: totalVolume,
    best_platform: bestPlatform,
    overall_competition: overallCompetition,
    recommended_strategy: recommendedStrategy
  };
};