import { Request, Response } from 'express';
import { getBacklinksOverview, getBulkBacklinks } from '../services/dataForSEOFunctional';
import { handleApiError } from '../utils/dataForSEOErrorHandlers';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { ProcessedResponse } from '../middleware/responseFormatter';
import { DataForSEOExtractors, DataForSEOResponseHandler } from '../utils/dataForSEOResponseHandler';

interface BacklinksRequest extends Request {
  body: {
    target: string;
    limit?: number;
    offset?: number;
    include_subdomains?: boolean;
  };
}

export const backlinksController = {
  async getOverview(req: BacklinksRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { target, include_subdomains } = req.body;

      // Input validation is now handled by middleware
      const cleanTarget = target.trim();

      logInfo('Backlinks overview request', {
        target: cleanTarget.substring(0, 100),
        include_subdomains
      });

      const backlinksParams = {
        target: cleanTarget,
        include_subdomains
      };

      const response = await getBacklinksOverview(backlinksParams);
      const responseTime = Date.now() - startTime;

      // Use defensive extraction - gets first result item safely
      const overview = DataForSEOExtractors.backlinksOverview(response);
      
      // Get response summary for monitoring
      const responseSummary = DataForSEOResponseHandler.getResponseSummary(response);
      
      // Log warnings if any
      if (responseSummary.warnings.length > 0) {
        logInfo('Backlinks overview response warnings', {
          warnings: responseSummary.warnings,
          totalResults: responseSummary.totalResults
        });
      }

      processedRes.apiSuccess({
        target: cleanTarget,
        include_subdomains: include_subdomains || false,
        overview: {
          backlinks: overview.backlinks || 0,
          referring_domains: overview.referring_domains || 0,
          referring_main_domains: overview.referring_main_domains || 0,
          referring_ips: overview.referring_ips || 0,
          backlinks_spam_score: overview.backlinks_spam_score || 0,
          domain_rank: overview.domain_rank || 0,
          domain_trust: overview.domain_trust || 0,
          domain_in_link_rank: overview.domain_in_link_rank || 0,
          broken_backlinks: overview.broken_backlinks || 0,
          broken_pages: overview.broken_pages || 0,
          referring_domains_nofollow: overview.referring_domains_nofollow || 0,
          first_seen: overview.first_seen || null,
          lost_date: overview.lost_date || null
        },
        cost: response.cost || 0
      }, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getBacklinksOverview');
      
      logError('Backlinks overview request failed', dataForSEOError, {
        apiEndpoint: '/api/seo/backlinks/overview',
        responseTime
      });

      processedRes.status(dataForSEOError.statusCode || 500).apiError(
        dataForSEOError.message,
        dataForSEOError.statusCode === 402 ? 'INSUFFICIENT_CREDITS' :
        dataForSEOError.statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' :
        'API_ERROR',
        {
          cost: dataForSEOError.cost || 0,
          retryable: dataForSEOError.retryable,
          response_time_ms: responseTime
        }
      );
    }
  },

  async getBulkBacklinks(req: BacklinksRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { target, limit = 100, offset = 0, include_subdomains } = req.body;

      // Input validation is now handled by middleware

      const cleanTarget = target.trim();

      logInfo('Bulk backlinks request', {
        target: cleanTarget.substring(0, 100),
        limit,
        offset,
        include_subdomains
      });

      const backlinksParams = {
        target: cleanTarget,
        limit,
        offset,
        include_subdomains
      };

      const response = await getBulkBacklinks(backlinksParams);
      const responseTime = Date.now() - startTime;

      const backlinks = DataForSEOExtractors.backlinksList(response);

      processedRes.apiSuccess({
        target: cleanTarget,
        limit,
        offset,
        include_subdomains: include_subdomains || false,
        total_count: backlinks.length,
        backlinks: backlinks.map((backlink: any) => ({
          domain_from: backlink.domain_from,
          url_from: backlink.url_from,
          domain_to: backlink.domain_to,
          url_to: backlink.url_to,
          anchor: backlink.anchor,
          rank: backlink.rank || 0,
          page_from_rank: backlink.page_from_rank || 0,
          domain_from_rank: backlink.domain_from_rank || 0,
          page_from_external_links: backlink.page_from_external_links || 0,
          page_from_internal_links: backlink.page_from_internal_links || 0,
          is_new: backlink.is_new || false,
          is_lost: backlink.is_lost || false,
          first_seen: backlink.first_seen,
          last_seen: backlink.last_seen,
          item_type: backlink.item_type,
          semantic_location: backlink.semantic_location,
          links_count: backlink.links_count || 0,
          group_count: backlink.group_count || 0,
          is_alt: backlink.is_alt || false,
          is_image: backlink.is_image || false,
          is_link: backlink.is_link || false,
          is_text: backlink.is_text || false
        })),
        cost: response.cost || 0
      }, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getBulkBacklinks');
      
      logError('Bulk backlinks request failed', dataForSEOError, {
        apiEndpoint: '/api/seo/backlinks/bulk',
        responseTime
      });

      processedRes.status(dataForSEOError.statusCode || 500).apiError(
        dataForSEOError.message,
        'BULK_BACKLINKS_ERROR',
        {
          cost: dataForSEOError.cost || 0,
          retryable: dataForSEOError.retryable,
          response_time_ms: responseTime
        }
      );
    }
  },

  async analyzeCompetitorGap(req: Request, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { your_domain, competitor_domains } = req.body;

      // Input validation is now handled by middleware

      logInfo('Competitor backlinks gap analysis', {
        your_domain: your_domain.substring(0, 50),
        competitor_count: competitor_domains.length
      });

      // Get backlink overview for your domain and all competitors
      const analysisPromises = [your_domain, ...competitor_domains].map(domain =>
        getBacklinksOverview({ target: domain.trim() })
          .then(response => ({
            domain: domain.trim(),
            data: DataForSEOExtractors.backlinksOverview(response),
            cost: response.cost || 0
          }))
          .catch(error => ({
            domain: domain.trim(),
            error: handleApiError(error, 'analyzeCompetitorGap').message,
            cost: 0
          }))
      );

      const results = await Promise.all(analysisPromises);
      const responseTime = Date.now() - startTime;

      const yourDomainData: any = results[0];
      const competitorData: any[] = results.slice(1);
      const totalCost = results.reduce((sum, result) => sum + result.cost, 0);

      // Calculate gap analysis using defensive data access
      const analysis = {
        your_domain: {
          domain: your_domain,
          backlinks: yourDomainData.data?.backlinks || 0,
          referring_domains: yourDomainData.data?.referring_domains || 0,
          domain_rank: yourDomainData.data?.domain_rank || 0,
          error: yourDomainData.error || null
        },
        competitors: competitorData.map((comp: any) => ({
          domain: comp.domain,
          backlinks: comp.data?.backlinks || 0,
          referring_domains: comp.data?.referring_domains || 0,
          domain_rank: comp.data?.domain_rank || 0,
          backlinks_advantage: (comp.data?.backlinks || 0) - (yourDomainData.data?.backlinks || 0),
          referring_domains_advantage: (comp.data?.referring_domains || 0) - (yourDomainData.data?.referring_domains || 0),
          error: comp.error || null
        })),
        insights: {
          strongest_competitor: competitorData.reduce((strongest, current) => 
            (current.data?.backlinks || 0) > (strongest.data?.backlinks || 0) ? current : strongest
          ).domain,
          average_competitor_backlinks: competitorData.reduce((sum, comp) => 
            sum + (comp.data?.backlinks || 0), 0) / competitorData.length,
          your_position: competitorData.filter(comp => 
            (comp.data?.backlinks || 0) < (yourDomainData.data?.backlinks || 0)
          ).length + 1
        }
      };

      processedRes.apiSuccess({
        ...analysis,
        total_cost: totalCost
      }, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'analyzeCompetitorGap');
      
      logError('Competitor gap analysis failed', dataForSEOError, {
        apiEndpoint: '/api/seo/backlinks/competitor-gap',
        responseTime
      });

      processedRes.status(dataForSEOError.statusCode || 500).apiError(
        dataForSEOError.message,
        'COMPETITOR_GAP_ERROR',
        {
          cost: dataForSEOError.cost || 0,
          response_time_ms: responseTime
        }
      );
    }
  }
};