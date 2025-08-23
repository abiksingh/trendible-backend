// Base API Response Structure
export interface DataForSEOResponse<T = any> {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: DataForSEOTask<T>[];
}

export interface DataForSEOTask<T = any> {
  id: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  result_count: number;
  path: string[];
  data: any;
  result?: T[];
}

// SERP API Types
export interface SerpRequestParams {
  keyword: string;
  location_code?: number;
  location_name?: string;
  language_code?: string;
  language_name?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  os?: string;
}

export interface SerpOrganicResult {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position: string;
  xpath: string;
  domain: string;
  title: string;
  url: string;
  breadcrumb?: string;
  is_image: boolean;
  is_video: boolean;
  is_featured_snippet: boolean;
  is_malicious: boolean;
  description?: string;
  pre_snippet?: string;
  extended_snippet?: string;
  amp_version?: boolean;
  rating?: {
    rating_type: string;
    value: number;
    votes_count: number;
    rating_max: number;
  };
  highlighted?: string[];
  links?: any[];
  about_this_result?: {
    type: string;
    url: string;
    source: string;
  };
  related_search_url?: string;
  timestamp: string;
}

export interface SerpResponse {
  keyword: string;
  type: string;
  se_domain: string;
  location_code: number;
  language_code: string;
  check_url: string;
  datetime: string;
  spell?: any;
  item_types: string[];
  se_results_count: number;
  items_count: number;
  items: SerpOrganicResult[];
}

// Keywords Data API Types
export interface KeywordDataRequest {
  keywords: string[];
  location_code?: number;
  language_code?: string;
  include_serp_info?: boolean;
  include_clickstream_data?: boolean;
  sort_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface KeywordData {
  keyword: string;
  location_code: number;
  language_code: string;
  search_volume: number;
  competition: number;
  competition_level: 'LOW' | 'MEDIUM' | 'HIGH';
  cpc: number;
  monthly_searches: MonthlySearch[];
  keyword_annotations?: {
    concepts: any[];
  };
}

export interface MonthlySearch {
  year: number;
  month: number;
  search_volume: number;
}

// Backlinks API Types
export interface BacklinksRequest {
  target: string;
  mode?: 'as_is' | 'one_per_domain' | 'one_per_anchor';
  filters?: any[];
  order_by?: string[];
  limit?: number;
  offset?: number;
  include_subdomains?: boolean;
  include_indirect_links?: boolean;
  exclude_internal_backlinks?: boolean;
}

export interface BacklinkData {
  type: string;
  domain_from: string;
  url_from: string;
  domain_to: string;
  url_to: string;
  tld_from: string;
  is_new: boolean;
  is_lost: boolean;
  rank: number;
  page_from_rank: number;
  domain_from_rank: number;
  page_from_external_links: number;
  page_from_internal_links: number;
  page_from_size: number;
  text_pre: string;
  anchor: string;
  text_post: string;
  semantic_location: string;
  links_count: number;
  group_count: number;
  is_alt: boolean;
  is_image: boolean;
  is_link: boolean;
  is_text: boolean;
  last_seen: string;
  first_seen: string;
  item_type: string;
}

// Domain Analytics API Types
export interface DomainAnalyticsRequest {
  target: string;
  location_code?: number;
  language_code?: string;
  include_clickstream_data?: boolean;
  filters?: any[];
  order_by?: string[];
  limit?: number;
  offset?: number;
}

export interface DomainAnalyticsData {
  target: string;
  organic_keywords: number;
  organic_traffic: number;
  organic_cost: number;
  paid_keywords: number;
  paid_traffic: number;
  paid_cost: number;
  organic_count: number;
  paid_count: number;
  total_count: number;
  metrics: {
    organic: DomainMetrics;
    paid: DomainMetrics;
  };
}

export interface DomainMetrics {
  pos_1: number;
  pos_2_3: number;
  pos_4_10: number;
  pos_11_20: number;
  pos_21_30: number;
  pos_31_40: number;
  pos_41_50: number;
  pos_51_60: number;
  pos_61_70: number;
  pos_71_80: number;
  pos_81_90: number;
  pos_91_100: number;
  etv: number;
  impressions_etv: number;
  count: number;
  estimated_paid_traffic_cost: number;
  is_new: number;
  is_up: number;
  is_down: number;
  is_lost: number;
}

// Common Error Types
export interface ApiError {
  status_code: number;
  status_message: string;
  time?: string;
}

// Request Options
export interface RequestOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// Location and Language Types
export interface LocationData {
  location_code: number;
  location_name: string;
  location_code_parent?: number;
  country_iso_code: string;
  location_type: string;
}

export interface LanguageData {
  language_name: string;
  language_code: string;
}