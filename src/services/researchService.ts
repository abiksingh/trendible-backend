import { getKeywordData, searchGoogleOrganic, searchGooglePaidAds } from './dataForSEOFunctional';
import { getKeywordDataExtended } from './dataForSEOSimple';
import { DataForSEOExtractors, DataForSEOResponseHandler } from '../utils/dataForSEOResponseHandler';
import { logInfo, logError, logWarn } from '../utils/dataForSEOLogger';
import { dataForSEOConfig } from '../config/dataForSEOConfig';

export interface KeywordIntelligenceParams {
  keyword: string;
  location_code?: number;
  language_code?: string;
  source: string;
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
  const { keyword, location_code = 2840, language_code = 'en', source } = params;
  
  logInfo('Starting keyword intelligence research', {
    keyword,
    location_code,
    language_code,
    source
  });

  let totalCost = 0;
  const sourcesQueried: string[] = [];
  const searchEngines: any = {};

  try {
    // Google Search Engine Data
    if (source === 'google') {
      const [googleData, googleDifficultyData] = await Promise.all([
        getGoogleKeywordData(keyword, location_code, language_code),
        getKeywordDifficulty(keyword, location_code, language_code)
      ]);
      
      // Enhance Google data with real difficulty and advanced trends
      searchEngines.google = {
        ...googleData.data,
        difficulty_score: googleDifficultyData.data.difficulty_score,
        complexity: googleDifficultyData.data.complexity,
        advanced_trends: calculateAdvancedTrend(googleData.data.monthly_searches || [])
      };
      
      totalCost += googleData.cost + googleDifficultyData.cost;
      sourcesQueried.push('google');
    }

    // Bing Search Engine Data
    else if (source === 'bing') {
      const [bingData, bingDifficultyData] = await Promise.all([
        getBingKeywordData(keyword, location_code, language_code),
        getBingKeywordDifficulty(keyword, location_code, language_code)
      ]);
      
      // Enhance Bing data with real difficulty and advanced trends
      searchEngines.bing = {
        ...bingData.data,
        difficulty_score: bingDifficultyData.data.difficulty_score,
        complexity: bingDifficultyData.data.complexity,
        advanced_trends: calculateAdvancedTrend((bingData.data as any).monthly_searches || [])
      };
      
      totalCost += bingData.cost + bingDifficultyData.cost;
      sourcesQueried.push('bing');
    }

    // YouTube Data
    else if (source === 'youtube') {
      const youtubeData = await getYouTubeKeywordData(keyword, location_code, language_code);
      searchEngines.youtube = youtubeData.data;
      totalCost += youtubeData.cost;
      sourcesQueried.push('youtube');
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

export const getGoogleKeywordData = async (keyword: string, locationCode: number, languageCode: string, extendedHistory = true) => {
  const startTime = Date.now();
  
  try {
    // Get extended historical data (up to 4 years if available)
    const requestParams: any = {
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode
    };

    if (extendedHistory) {
      // Set date range for extended historical data
      const currentDate = new Date();
      const fourYearsAgo = new Date(currentDate);
      fourYearsAgo.setFullYear(currentDate.getFullYear() - 4);
      
      // Format dates as YYYY-MM-DD
      requestParams.date_from = fourYearsAgo.toISOString().split('T')[0];
      requestParams.date_to = currentDate.toISOString().split('T')[0];
      
      logInfo('Extended historical keyword data request', {
        keyword,
        date_from: requestParams.date_from,
        date_to: requestParams.date_to
      });
    }

    // Get keyword metrics data - use extended endpoint if date range specified
    const keywordResponse = extendedHistory && requestParams.date_from ? 
      await getKeywordDataExtended(requestParams) : 
      await getKeywordData(requestParams);

    const keywordResults = DataForSEOExtractors.keywordResults(keywordResponse);
    const keywordSummary = DataForSEOResponseHandler.getResponseSummary(keywordResponse);

    // Get SERP data for additional insights
    let serpFeatures: string[] = [];
    let intent = 'unknown';
    let paidCompetitionAnalysis = null;
    
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
      
      // Analyze paid competition from organic SERP results
      paidCompetitionAnalysis = await analyzePaidCompetition(serpResults, 'google');
      
    } catch (serpError) {
      logWarn('SERP data unavailable for keyword analysis', { error: serpError });
    }

    // Try dedicated Google Paid Ads endpoint for more comprehensive paid data
    if (!paidCompetitionAnalysis?.paid_competition?.ads_count || paidCompetitionAnalysis.paid_competition.ads_count === 0) {
      try {
        logInfo('Attempting dedicated Google Paid Ads endpoint for comprehensive paid data');
        const googlePaidResponse = await searchGooglePaidAds({
          keyword,
          location_code: locationCode,
          language_code: languageCode
        });

        const paidSerpResults = DataForSEOExtractors.serpResults(googlePaidResponse);
        paidCompetitionAnalysis = await analyzePaidCompetition(paidSerpResults, 'google');
        
      } catch (paidError) {
        logWarn('Google Paid Ads endpoint unavailable', { error: paidError });
      }
    }

    // Process keyword data
    const keywordData = keywordResults[0] || {};
    const competition = keywordData.competition || 0;
    
    // Calculate competition level from competition score
    let competitionLevel = 'low';
    if (competition > 0.7) competitionLevel = 'high';
    else if (competition > 0.4) competitionLevel = 'medium';
    
    return {
      data: {
        search_volume: keywordData.search_volume || 0,
        competition: competition,
        cpc: keywordData.cpc || 0,
        competition_level: competitionLevel,
        monthly_searches: keywordData.monthly_searches || [],
        serp_features: serpFeatures,
        serp_analysis: analyzeSerpStrategy(serpFeatures),
        intent: intent,
        trend: calculateTrend(keywordData.monthly_searches || []),
        paid_competition: paidCompetitionAnalysis?.paid_competition || {
          ads_count: 0,
          competition_level: 'none',
          advertiser_domains: [],
          strategic_insights: ['No paid competition data available']
        }
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
    // Direct SERP feature types from DataForSEO advanced endpoint
    if (result.type === 'people_also_ask') features.push('people_also_ask');
    if (result.type === 'knowledge_graph') features.push('knowledge_graph');
    if (result.type === 'featured_snippet') features.push('featured_snippet');
    if (result.type === 'local_pack') features.push('local_pack');
    if (result.type === 'shopping') features.push('shopping');
    if (result.type === 'images') features.push('images');
    if (result.type === 'videos') features.push('videos');
    if (result.type === 'top_stories') features.push('news');
    if (result.type === 'related_searches') features.push('related_searches');
    if (result.type === 'ai_overview') features.push('ai_overview');
    if (result.type === 'answer_box') features.push('answer_box');
    if (result.type === 'jobs') features.push('jobs');
    if (result.type === 'local_services') features.push('local_services');
    if (result.type === 'reviews') features.push('reviews');
  }

  return [...new Set(features)]; // Remove duplicates
};

// Analyze SERP features for strategic insights
export const analyzeSerpStrategy = (serpFeatures: string[]): any => {
  const featureCount = serpFeatures.length;
  const contentOpportunities: string[] = [];
  const competitionIndicators: string[] = [];
  
  // Analyze each feature for opportunities
  serpFeatures.forEach(feature => {
    switch (feature) {
      case 'people_also_ask':
        contentOpportunities.push('Create comprehensive FAQ content');
        contentOpportunities.push('Target question-based keywords');
        break;
      case 'featured_snippet':
        contentOpportunities.push('Optimize for featured snippets with structured content');
        contentOpportunities.push('Use clear headings and concise answers');
        break;
      case 'images':
        contentOpportunities.push('Include high-quality visual content');
        contentOpportunities.push('Optimize image alt text and file names');
        break;
      case 'videos':
        contentOpportunities.push('Create video content strategy');
        contentOpportunities.push('Optimize for YouTube SEO');
        break;
      case 'news':
        contentOpportunities.push('Focus on timely, newsworthy content');
        contentOpportunities.push('Establish content publishing frequency');
        break;
      case 'local_pack':
        contentOpportunities.push('Optimize for local SEO');
        contentOpportunities.push('Focus on location-based keywords');
        break;
      case 'shopping':
        contentOpportunities.push('Include product-focused content');
        contentOpportunities.push('Add e-commerce optimization');
        break;
      case 'knowledge_graph':
        contentOpportunities.push('Build entity authority and brand recognition');
        contentOpportunities.push('Focus on structured data markup');
        break;
      case 'related_searches':
        contentOpportunities.push('Research semantic and related keywords');
        contentOpportunities.push('Create topic clusters around main keyword');
        break;
      case 'ai_overview':
        contentOpportunities.push('Create authoritative, comprehensive content');
        contentOpportunities.push('Focus on E-A-T (Expertise, Authority, Trust)');
        break;
    }
  });

  // Competition analysis
  if (featureCount >= 5) {
    competitionIndicators.push('Very high SERP competition');
    competitionIndicators.push('Multiple features competing for clicks');
  } else if (featureCount >= 3) {
    competitionIndicators.push('Moderate SERP competition');
    competitionIndicators.push('Several features present');
  } else if (featureCount >= 1) {
    competitionIndicators.push('Some SERP competition');
    competitionIndicators.push('Limited features competing');
  } else {
    competitionIndicators.push('Clean organic SERP');
    competitionIndicators.push('Traditional search results');
  }

  // CTR impact estimation
  let ctrImpact = 0;
  serpFeatures.forEach(feature => {
    switch (feature) {
      case 'featured_snippet': ctrImpact -= 8; break;
      case 'people_also_ask': ctrImpact -= 5; break;
      case 'images': ctrImpact -= 4; break;
      case 'videos': ctrImpact -= 6; break;
      case 'shopping': ctrImpact -= 7; break;
      case 'local_pack': ctrImpact -= 10; break;
      case 'knowledge_graph': ctrImpact -= 3; break;
      case 'news': ctrImpact -= 5; break;
      case 'ai_overview': ctrImpact -= 12; break;
      default: ctrImpact -= 2; break;
    }
  });

  // Organic difficulty modifier
  let organicDifficulty = 'low';
  if (featureCount >= 4) organicDifficulty = 'very_high';
  else if (featureCount >= 3) organicDifficulty = 'high';  
  else if (featureCount >= 2) organicDifficulty = 'medium';

  return {
    feature_count: featureCount,
    organic_competition: organicDifficulty,
    estimated_ctr_impact: Math.max(ctrImpact, -50), // Cap at -50%
    content_opportunities: [...new Set(contentOpportunities)], // Remove duplicates
    competition_indicators: [...new Set(competitionIndicators)],
    strategic_priority: featureCount >= 3 ? 'high_competition_strategy' : 'standard_seo_approach'
  };
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


// Advanced trend analysis with quarterly and yearly patterns
export const calculateAdvancedTrend = (monthlySearches: any[]): any => {
  if (!monthlySearches || monthlySearches.length < 3) {
    return {
      monthly_trend: 'insufficient_data',
      quarterly_trend: 'insufficient_data',
      yearly_trend: 'insufficient_data',
      seasonality: 'unknown',
      volatility: 'unknown'
    };
  }

  const volumes = monthlySearches.map(m => m.search_volume || 0);
  const totalMonths = volumes.length;
  
  // Monthly trend (basic 3-month comparison)
  const monthlyTrend = calculateTrend(monthlySearches);
  
  // Quarterly trend (last 3 months vs previous 3 months)
  let quarterlyTrend = 'insufficient_data';
  if (totalMonths >= 6) {
    const lastQuarter = volumes.slice(-3);
    const prevQuarter = volumes.slice(-6, -3);
    const lastQuarterAvg = lastQuarter.reduce((a, b) => a + b, 0) / 3;
    const prevQuarterAvg = prevQuarter.reduce((a, b) => a + b, 0) / 3;
    
    if (prevQuarterAvg > 0) {
      const quarterlyChange = ((lastQuarterAvg - prevQuarterAvg) / prevQuarterAvg) * 100;
      quarterlyTrend = quarterlyChange > 15 ? `+${Math.round(quarterlyChange)}%` : 
                     quarterlyChange < -15 ? `${Math.round(quarterlyChange)}%` : 'stable';
    }
  }

  // Yearly trend - enhanced for extended historical data
  let yearlyTrend = 'insufficient_data';
  let yearOverYearGrowth = null;
  
  if (totalMonths >= 24) {
    // Compare last 12 months with same period previous year
    const currentYear = volumes.slice(-12);
    const previousYear = volumes.slice(-24, -12);
    
    const currentYearTotal = currentYear.reduce((a, b) => a + b, 0);
    const previousYearTotal = previousYear.reduce((a, b) => a + b, 0);
    
    if (previousYearTotal > 0) {
      yearOverYearGrowth = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
      yearlyTrend = yearOverYearGrowth > 20 ? `+${Math.round(yearOverYearGrowth)}%` : 
                   yearOverYearGrowth < -20 ? `${Math.round(yearOverYearGrowth)}%` : 'stable';
    }
  } else if (totalMonths >= 12) {
    // For 12+ months, compare first and last 6 months
    const firstHalf = volumes.slice(0, 6);
    const lastHalf = volumes.slice(-6);
    
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const lastHalfAvg = lastHalf.reduce((a, b) => a + b, 0) / lastHalf.length;
    
    if (firstHalfAvg > 0) {
      const halfYearChange = ((lastHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      yearlyTrend = halfYearChange > 25 ? `+${Math.round(halfYearChange)}%` : 
                   halfYearChange < -25 ? `${Math.round(halfYearChange)}%` : 'stable';
    }
  }

  // Enhanced seasonality detection
  const maxVolume = Math.max(...volumes);
  const minVolume = Math.min(...volumes);
  let seasonality = 'low';
  
  if (maxVolume > 0) {
    const variationPercent = ((maxVolume - minVolume) / maxVolume) * 100;
    if (variationPercent > 60) seasonality = 'very_high';
    else if (variationPercent > 40) seasonality = 'high';
    else if (variationPercent > 25) seasonality = 'medium';
  }

  // Volatility calculation
  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
  const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0;

  return {
    monthly_trend: monthlyTrend,
    quarterly_trend: quarterlyTrend,
    yearly_trend: yearlyTrend,
    year_over_year_growth: yearOverYearGrowth,
    seasonality,
    volatility: volatility > 0.4 ? 'very_high' : volatility > 0.3 ? 'high' : volatility > 0.15 ? 'medium' : 'low',
    peak_month: monthlySearches[volumes.indexOf(maxVolume)]?.month || null,
    low_month: monthlySearches[volumes.indexOf(minVolume)]?.month || null,
    historical_months: totalMonths,
    avg_monthly_volume: Math.round(mean)
  };
};

// Get Bing keyword difficulty score (real DataForSEO data)
export const getBingKeywordDifficulty = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const data = [{
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode
    }];

    const baseURL = dataForSEOConfig.baseUrl;
    const auth = btoa(`${dataForSEOConfig.credentials.username}:${dataForSEOConfig.credentials.password}`);
    
    const response = await fetch(`${baseURL}/v3/dataforseo_labs/bing/bulk_keyword_difficulty/live`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Bing keyword difficulty API failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const processingTime = Date.now() - startTime;
    
    if (result.status_code !== 20000) {
      logError('Bing keyword difficulty API failed', {
        status_code: result.status_code,
        status_message: result.status_message,
        keyword
      });
      throw new Error(`Bing keyword difficulty API error: ${result.status_message}`);
    }

    const difficultyItems = result.tasks?.[0]?.result?.[0]?.items || [];
    const cost = result.tasks?.[0]?.cost || 0;

    // Debug logging
    logInfo('Bing keyword difficulty API response', {
      keyword,
      items_count: difficultyItems.length,
      first_item_difficulty: difficultyItems[0]?.keyword_difficulty
    });

    // Find the keyword result
    const keywordResult = difficultyItems.find((item: any) => item.keyword === keyword);

    if (!keywordResult) {
      return {
        data: {
          keyword,
          difficulty_score: null,
          complexity: 'unknown',
          competition_level: 'unknown'
        },
        cost,
        processing_time: processingTime
      };
    }

    // Calculate complexity based on difficulty score
    const difficultyScore = keywordResult.keyword_difficulty || 0;
    let complexity = 'easy';
    if (difficultyScore > 80) complexity = 'very_hard';
    else if (difficultyScore > 60) complexity = 'hard';
    else if (difficultyScore > 40) complexity = 'medium';
    else if (difficultyScore > 20) complexity = 'moderate';

    return {
      data: {
        keyword,
        difficulty_score: difficultyScore,
        complexity,
        competition_level: difficultyScore > 70 ? 'high' : difficultyScore > 40 ? 'medium' : 'low'
      },
      cost,
      processing_time: processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logError('Bing keyword difficulty request failed', {
      keyword,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      data: {
        keyword,
        difficulty_score: null,
        complexity: 'unknown',
        competition_level: 'unknown',
        api_error: error instanceof Error ? error.message : 'Unknown error'
      },
      cost: 0,
      processing_time: processingTime
    };
  }
};

// Get Google keyword difficulty score (real DataForSEO data)
export const getKeywordDifficulty = async (keyword: string, locationCode: number, languageCode: string) => {
  const startTime = Date.now();
  
  try {
    const data = [{
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode
    }];

    const baseURL = dataForSEOConfig.baseUrl;
    const auth = btoa(`${dataForSEOConfig.credentials.username}:${dataForSEOConfig.credentials.password}`);
    
    const response = await fetch(`${baseURL}/v3/dataforseo_labs/google/bulk_keyword_difficulty/live`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Google keyword difficulty API failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const processingTime = Date.now() - startTime;
    
    if (result.status_code !== 20000) {
      logError('Google keyword difficulty API failed', {
        status_code: result.status_code,
        status_message: result.status_message,
        keyword
      });
      throw new Error(`Google keyword difficulty API error: ${result.status_message}`);
    }

    const difficultyItems = result.tasks?.[0]?.result?.[0]?.items || [];
    const cost = result.tasks?.[0]?.cost || 0;

    // Debug logging
    logInfo('Google keyword difficulty API response', {
      keyword,
      items_count: difficultyItems.length,
      first_item_difficulty: difficultyItems[0]?.keyword_difficulty
    });

    // Find the keyword result
    const keywordResult = difficultyItems.find((item: any) => item.keyword === keyword);

    if (!keywordResult) {
      return {
        data: {
          keyword,
          difficulty_score: null,
          complexity: 'unknown',
          competition_level: 'unknown'
        },
        cost,
        processing_time: processingTime
      };
    }

    // Calculate complexity based on difficulty score
    const difficultyScore = keywordResult.keyword_difficulty || 0;
    let complexity = 'easy';
    if (difficultyScore > 80) complexity = 'very_hard';
    else if (difficultyScore > 60) complexity = 'hard';
    else if (difficultyScore > 40) complexity = 'medium';
    else if (difficultyScore > 20) complexity = 'moderate';

    return {
      data: {
        keyword,
        difficulty_score: difficultyScore,
        complexity,
        competition_level: difficultyScore > 70 ? 'high' : difficultyScore > 40 ? 'medium' : 'low'
      },
      cost,
      processing_time: processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logError('Google keyword difficulty request failed', {
      keyword,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      data: {
        keyword,
        difficulty_score: null,
        complexity: 'unknown',
        competition_level: 'unknown',
        api_error: error instanceof Error ? error.message : 'Unknown error'
      },
      cost: 0,
      processing_time: processingTime
    };
  }
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

    const serpFeatures = analyzeSerpFeatures(serpResults);
    
    // Analyze paid competition for Bing
    const paidCompetitionAnalysis = await analyzePaidCompetition(serpResults, 'bing');
    
    return {
      data: {
        search_volume: 0, // Bing doesn't provide direct volume in SERP
        results: serpResults,
        total_results: serpResults.length,
        serp_features: serpFeatures,
        serp_analysis: analyzeSerpStrategy(serpFeatures),
        intent: determineSearchIntent(serpResults, keyword),
        platform: 'bing',
        paid_competition: paidCompetitionAnalysis?.paid_competition || {
          ads_count: 0,
          competition_level: 'none',
          advertiser_domains: [],
          strategic_insights: ['No paid competition data available']
        }
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

// Analyze paid competition from SERP results
export const analyzePaidCompetition = async (serpResults: any[], platform: string = 'google'): Promise<any> => {
  const startTime = Date.now();
  
  try {
    const paidResults = serpResults.filter((result: any) => result.type === 'paid');
    
    if (paidResults.length === 0) {
      return {
        paid_competition: {
          ads_count: 0,
          competition_level: 'none',
          advertiser_domains: [],
          ad_positions: [],
          strategic_insights: [
            'No paid competition detected',
            'Opportunity for paid advertising entry',
            'Lower cost-per-click expected'
          ]
        },
        processing_time: Date.now() - startTime
      };
    }

    // Extract advertiser information
    const advertiserDomains = [...new Set(paidResults.map((ad: any) => ad.domain).filter(Boolean))];
    const adPositions = paidResults.map((ad: any) => ({
      position: ad.rank_absolute || ad.rank_group || 0,
      domain: ad.domain,
      title: ad.title,
      url: ad.url
    }));

    // Analyze ad quality and features
    const adQualityScores = paidResults.map((ad: any) => calculateAdQuality(ad));
    const avgAdQuality = adQualityScores.length > 0 ? 
      adQualityScores.reduce((sum, score) => sum + score, 0) / adQualityScores.length : 0;

    // Competition level analysis
    let competitionLevel = 'low';
    if (paidResults.length >= 8) competitionLevel = 'very_high';
    else if (paidResults.length >= 5) competitionLevel = 'high';
    else if (paidResults.length >= 3) competitionLevel = 'medium';

    // Strategic insights generation
    const strategicInsights = generatePaidCompetitionInsights(
      paidResults.length,
      advertiserDomains,
      avgAdQuality,
      platform
    );

    return {
      paid_competition: {
        ads_count: paidResults.length,
        competition_level: competitionLevel,
        advertiser_domains: advertiserDomains,
        ad_positions: adPositions,
        average_ad_quality: Math.round(avgAdQuality * 10) / 10,
        top_advertisers: getTopAdvertisers(paidResults),
        ad_features: analyzeAdFeatures(paidResults),
        strategic_insights: strategicInsights,
        platform: platform
      },
      processing_time: Date.now() - startTime
    };

  } catch (error) {
    logError('Paid competition analysis failed', { error, platform });
    return {
      paid_competition: {
        ads_count: 0,
        competition_level: 'unknown',
        advertiser_domains: [],
        ad_positions: [],
        strategic_insights: ['Analysis failed - manual review needed'],
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      processing_time: Date.now() - startTime
    };
  }
};

// Calculate ad quality score based on available features
const calculateAdQuality = (ad: any): number => {
  let qualityScore = 5.0; // Base score

  // Title quality (length and clarity)
  if (ad.title) {
    const titleLength = ad.title.length;
    if (titleLength >= 30 && titleLength <= 60) qualityScore += 1.0;
    if (ad.title.includes('|') || ad.title.includes('-')) qualityScore += 0.5; // Brand separation
  }

  // Description quality
  if (ad.description && ad.description.length >= 80) qualityScore += 1.0;

  // Extensions and additional features
  if (ad.ad_aclk) qualityScore += 0.5; // Has tracking link
  if (ad.rating && ad.rating.value >= 4.0) qualityScore += 1.5; // Good rating
  if (ad.price_range) qualityScore += 0.5; // Shows pricing
  
  // Sitelinks or additional features
  if (ad.rectangle && ad.rectangle.items && ad.rectangle.items.length > 0) {
    qualityScore += 1.0; // Rich snippets/sitelinks
  }

  // Brand indicators
  if (ad.website_name) qualityScore += 0.5; // Clear brand name

  return Math.min(qualityScore, 10.0); // Cap at 10
};

// Generate strategic insights for paid competition
const generatePaidCompetitionInsights = (
  adsCount: number, 
  domains: string[], 
  avgQuality: number,
  platform: string
): string[] => {
  const insights: string[] = [];

  // Competition level insights
  if (adsCount >= 8) {
    insights.push('Extremely competitive paid landscape');
    insights.push('High CPC expected - consider long-tail targeting');
    insights.push('Quality Score optimization critical for success');
  } else if (adsCount >= 5) {
    insights.push('Highly competitive paid market');
    insights.push('Focus on ad quality and landing page optimization');
  } else if (adsCount >= 3) {
    insights.push('Moderate paid competition');
    insights.push('Good opportunity with proper targeting');
  } else if (adsCount > 0) {
    insights.push('Limited paid competition');
    insights.push('Opportunity for market entry with lower CPC');
  }

  // Domain diversity insights
  const uniqueDomains = domains.length;
  if (uniqueDomains === adsCount) {
    insights.push('Diverse advertiser base - no single dominant player');
  } else if (uniqueDomains < adsCount / 2) {
    insights.push('Few advertisers running multiple ads - aggressive competition');
  }

  // Ad quality insights
  if (avgQuality >= 8.0) {
    insights.push('High-quality ads with rich features - premium competition');
    insights.push('Invest in professional ad copy and extensions');
  } else if (avgQuality >= 6.0) {
    insights.push('Standard ad quality - opportunity for differentiation');
  } else if (avgQuality < 5.0) {
    insights.push('Room for improvement in ad quality - competitive advantage possible');
  }

  // Platform-specific insights
  if (platform === 'bing') {
    insights.push('Bing audience may have different intent - test messaging variations');
    if (adsCount < 5) {
      insights.push('Less competition on Bing - potential for better ROI');
    }
  } else if (platform === 'google') {
    insights.push('Google Ads competition - focus on Quality Score factors');
  }

  return insights;
};

// Get top advertisers by position and frequency
const getTopAdvertisers = (paidResults: any[]): any[] => {
  const advertisers = new Map();

  paidResults.forEach((ad: any) => {
    if (ad.domain) {
      if (!advertisers.has(ad.domain)) {
        advertisers.set(ad.domain, {
          domain: ad.domain,
          ads_count: 0,
          positions: [],
          sample_title: ad.title || '',
          website_name: ad.website_name || ''
        });
      }
      
      const advertiser = advertisers.get(ad.domain);
      advertiser.ads_count += 1;
      advertiser.positions.push(ad.rank_absolute || ad.rank_group || 0);
    }
  });

  return Array.from(advertisers.values())
    .sort((a, b) => b.ads_count - a.ads_count)
    .slice(0, 5);
};

// Analyze ad features across all paid results
const analyzeAdFeatures = (paidResults: any[]): any => {
  const features = {
    has_ratings: 0,
    has_pricing: 0,
    has_extensions: 0,
    has_images: 0,
    avg_title_length: 0,
    avg_description_length: 0
  };

  let totalTitleLength = 0;
  let totalDescLength = 0;
  let titlesCount = 0;
  let descriptionsCount = 0;

  paidResults.forEach((ad: any) => {
    if (ad.rating) features.has_ratings += 1;
    if (ad.price_range || ad.price) features.has_pricing += 1;
    if (ad.rectangle && ad.rectangle.items) features.has_extensions += 1;
    if (ad.images && ad.images.length > 0) features.has_images += 1;

    if (ad.title) {
      totalTitleLength += ad.title.length;
      titlesCount += 1;
    }
    if (ad.description) {
      totalDescLength += ad.description.length;
      descriptionsCount += 1;
    }
  });

  features.avg_title_length = titlesCount > 0 ? Math.round(totalTitleLength / titlesCount) : 0;
  features.avg_description_length = descriptionsCount > 0 ? Math.round(totalDescLength / descriptionsCount) : 0;

  return {
    ...features,
    ratings_percentage: Math.round((features.has_ratings / paidResults.length) * 100),
    pricing_percentage: Math.round((features.has_pricing / paidResults.length) * 100),
    extensions_percentage: Math.round((features.has_extensions / paidResults.length) * 100),
    images_percentage: Math.round((features.has_images / paidResults.length) * 100)
  };
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