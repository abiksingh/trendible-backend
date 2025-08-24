import { Request, Response } from 'express';
import { getDomainOverview, getDomainTechnologies } from '../services/dataForSEOFunctional';
import { handleApiError } from '../utils/dataForSEOErrorHandlers';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { ProcessedResponse } from '../middleware/responseFormatter';
import { DataForSEOExtractors, DataForSEOResponseHandler } from '../utils/dataForSEOResponseHandler';

interface DomainRequest extends Request {
  body: {
    target: string;
    location_code?: number;
    language_code?: string;
  };
}

export const domainController = {
  async getOverview(req: DomainRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { target, location_code, language_code } = req.body;

      // Input validation is now handled by middleware
      const cleanTarget = target.trim().toLowerCase();
      
      // Remove protocol if present
      const domainPattern = cleanTarget.replace(/^https?:\/\//, '').replace(/\/$/, '');

      logInfo('Domain overview request', {
        target: domainPattern,
        location_code,
        language_code
      });

      const domainParams = {
        target: domainPattern,
        location_code,
        language_code
      };

      const response = await getDomainOverview(domainParams);
      const responseTime = Date.now() - startTime;

      // Use defensive extraction - gets first result item safely
      const overview = DataForSEOExtractors.domainOverview(response);
      
      // Get response summary for monitoring
      const responseSummary = DataForSEOResponseHandler.getResponseSummary(response);
      
      // Log warnings if any
      if (responseSummary.warnings.length > 0) {
        logInfo('Domain overview response warnings', {
          warnings: responseSummary.warnings,
          totalResults: responseSummary.totalResults
        });
      }

      processedRes.apiSuccess({
        target: domainPattern,
        location_code: location_code || 2840,
        language_code: language_code || 'en',
        whois: {
          domain_name: overview.domain,
          created_datetime: overview.created_datetime,
          changed_datetime: overview.changed_datetime,
          expiry_datetime: overview.expiry_datetime,
          updated_datetime: overview.updated_datetime,
          registrar: {
            name: overview.registrar?.registrar_name,
            url: overview.registrar?.url,
            phone: overview.registrar?.phone,
            email: overview.registrar?.email
          },
          contacts: {
            registrant: overview.registrant || null,
            administrative: overview.administrative || null,
            technical: overview.technical || null,
            billing: overview.billing || null
          }
        },
        backlinks_info: overview.backlinks_info || null,
        rank_info: overview.rank_info || null,
        cost: responseSummary.totalCost,
        api_metadata: {
          total_results: responseSummary.totalResults,
          successful_tasks: responseSummary.successfulTasks,
          response_time: responseSummary.responseTime
        }
      }, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getDomainOverview');
      
      logError('Domain overview request failed', dataForSEOError, {
        apiEndpoint: '/api/seo/domains/overview',
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

  async getTechnologies(req: DomainRequest, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { target } = req.body;

      // Input validation is now handled by middleware

      const cleanTarget = target.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      logInfo('Domain technologies request', {
        target: cleanTarget
      });

      const techParams = {
        target: cleanTarget
      };

      const response = await getDomainTechnologies(techParams);
      const responseTime = Date.now() - startTime;

      // Use defensive extraction - gets first result item safely
      const technologies = DataForSEOExtractors.domainTechnologies(response);
      
      // Get response summary for monitoring
      const responseSummary = DataForSEOResponseHandler.getResponseSummary(response);
      
      // Log warnings if any
      if (responseSummary.warnings.length > 0) {
        logInfo('Domain technologies response warnings', {
          warnings: responseSummary.warnings,
          totalResults: responseSummary.totalResults
        });
      }

      // Organize technologies by category
      const organizedTech: any = {
        web_servers: [],
        cms: [],
        analytics: [],
        javascript_frameworks: [],
        css_frameworks: [],
        marketing: [],
        widgets: [],
        other: []
      } as any;

      // Process technologies if available
      if (technologies.technologies) {
        Object.entries(technologies.technologies).forEach(([category, techs]: [string, any]) => {
          if (Array.isArray(techs)) {
            const categoryKey = category.toLowerCase().replace(/[\s-]/g, '_');
            if (organizedTech[categoryKey]) {
              organizedTech[categoryKey] = techs;
            } else {
              organizedTech.other = [...organizedTech.other, ...techs];
            }
          }
        });
      }

      processedRes.apiSuccess({
        target: cleanTarget,
        domain_info: {
          domain: technologies.domain,
          title: technologies.title,
          description: technologies.description,
          meta_keywords: technologies.meta_keywords
        },
        technologies: organizedTech,
        technology_summary: {
          total_technologies: Object.values(organizedTech).flat().length,
          categories_detected: Object.entries(organizedTech)
            .filter(([_, techs]) => Array.isArray(techs) && techs.length > 0)
            .map(([category, techs]) => ({
              category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              count: (techs as any[]).length
            }))
        },
        cost: responseSummary.totalCost,
        api_metadata: {
          total_results: responseSummary.totalResults,
          successful_tasks: responseSummary.successfulTasks,
          response_time: responseSummary.responseTime
        }
      }, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'getDomainTechnologies');
      
      logError('Domain technologies request failed', dataForSEOError, {
        apiEndpoint: '/api/seo/domains/technologies',
        responseTime
      });

      processedRes.status(dataForSEOError.statusCode || 500).apiError(
        dataForSEOError.message,
        'TECHNOLOGIES_ERROR',
        {
          cost: dataForSEOError.cost || 0,
          retryable: dataForSEOError.retryable,
          response_time_ms: responseTime
        }
      );
    }
  },

  async compareCompetitors(req: Request, res: Response) {
    const processedRes = res as ProcessedResponse;
    const startTime = Date.now();
    
    try {
      const { domains } = req.body;

      // Input validation is now handled by middleware

      logInfo('Domain comparison request', {
        domain_count: domains.length,
        domains: domains.slice(0, 5).map((d: string) => d.substring(0, 50))
      });

      // Get overview for each domain
      const comparisonPromises = domains.map((domain: string) =>
        getDomainOverview({ target: domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') })
          .then(response => {
            try {
              const data = DataForSEOExtractors.domainOverview(response);
              const summary = DataForSEOResponseHandler.getResponseSummary(response);
              return {
                domain: domain.trim(),
                success: true,
                data,
                cost: summary.totalCost,
                metadata: {
                  total_results: summary.totalResults,
                  warnings: summary.warnings
                }
              };
            } catch (extractError) {
              return {
                domain: domain.trim(),
                success: false,
                error: `Data extraction failed: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
                cost: response?.cost || 0
              };
            }
          })
          .catch(error => ({
            domain: domain.trim(),
            success: false,
            error: handleApiError(error, 'compareCompetitors').message,
            cost: 0
          }))
      );

      const results: any[] = await Promise.all(comparisonPromises);
      const responseTime = Date.now() - startTime;

      const successfulResults = results.filter((result: any) => result.success);
      const failedResults = results.filter((result: any) => !result.success);
      const totalCost = results.reduce((sum: number, result: any) => sum + result.cost, 0);

      // Generate comparison insights
      const comparison = {
        total_domains: domains.length,
        successful_analyses: successfulResults.length,
        failed_analyses: failedResults.length,
        domains: successfulResults.map((result: any) => ({
          domain: result.domain,
          whois: {
            created_datetime: result.data?.created_datetime,
            expiry_datetime: result.data?.expiry_datetime,
            registrar: result.data?.registrar?.registrar_name
          },
          rank_info: result.data?.rank_info || null,
          backlinks_info: result.data?.backlinks_info || null
        })),
        comparison_insights: {
          oldest_domain: successfulResults.reduce((oldest: any, current: any) => {
            const currentDate = new Date(current.data?.created_datetime || '9999-12-31');
            const oldestDate = new Date(oldest.data?.created_datetime || '9999-12-31');
            return currentDate < oldestDate ? current : oldest;
          }, successfulResults[0] || {})?.domain,
          
          newest_domain: successfulResults.reduce((newest: any, current: any) => {
            const currentDate = new Date(current.data?.created_datetime || '1970-01-01');
            const newestDate = new Date(newest.data?.created_datetime || '1970-01-01');
            return currentDate > newestDate ? current : newest;
          }, successfulResults[0] || {})?.domain
        },
        errors: failedResults.map((result: any) => ({
          domain: result.domain,
          error: result.error
        })),
        total_cost: totalCost
      };

      processedRes.apiSuccess(comparison, {
        response_time_ms: responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataForSEOError = handleApiError(error, 'compareCompetitors');
      
      logError('Domain comparison failed', dataForSEOError, {
        apiEndpoint: '/api/seo/domains/compare',
        responseTime
      });

      processedRes.status(dataForSEOError.statusCode || 500).apiError(
        dataForSEOError.message,
        'DOMAIN_COMPARISON_ERROR',
        {
          cost: dataForSEOError.cost || 0,
          response_time_ms: responseTime
        }
      );
    }
  }
};