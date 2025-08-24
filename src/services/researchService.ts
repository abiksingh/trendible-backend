import { getKeywordData, searchGoogleOrganic } from './dataForSEOFunctional';
import { DataForSEOExtractors, DataForSEOResponseHandler } from '../utils/dataForSEOResponseHandler';
import { logInfo, logError, logWarn } from '../utils/dataForSEOLogger';

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

  // Generate strategy recommendation
  let recommendedStrategy = 'focus on content quality';
  
  if (overallCompetition === 'high') {
    recommendedStrategy = 'target long-tail variations';
  } else if (overallCompetition === 'low' && totalVolume > 1000) {
    recommendedStrategy = 'opportunity for quick wins';
  } else if (totalVolume < 100) {
    recommendedStrategy = 'consider broader keyword variants';
  }

  return {
    total_volume: totalVolume,
    best_platform: bestPlatform,
    overall_competition: overallCompetition,
    recommended_strategy: recommendedStrategy
  };
};