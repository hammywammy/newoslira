/**
 * @file Instagram Analysis Hook
 * @description React Query hook for Instagram analysis
 * 
 * Replaces: HomeHandlers.js runInstagramAnalysis()
 */

import { useMutation } from '@tanstack/react-query';
import { logger } from '@/core/utils/logger';
import {
  analyzeInstagramAnonymous,
  generateDemoResults,
  isRateLimitError,
  type InstagramAnalysisResponse,
  type RateLimitError,
} from '../api/instagramApi';

// =============================================================================
// TYPES
// =============================================================================

export interface UseInstagramAnalysisOptions {
  onSuccess?: (data: InstagramAnalysisResponse) => void;
  onRateLimit?: (error: RateLimitError) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useInstagramAnalysis(options?: UseInstagramAnalysisOptions) {
  return useMutation({
    mutationFn: async (username: string) => {
      // Clean username
      const cleanUsername = username.trim().replace('@', '');

      if (!cleanUsername) {
        throw new Error('Please enter an Instagram username');
      }

      logger.info('Starting Instagram analysis', { username: cleanUsername });

      try {
        // Try real API first
        const result = await analyzeInstagramAnonymous(cleanUsername);
        return result;
      } catch (error) {
        // Check if rate limited
        if (isRateLimitError(error)) {
          logger.warn('Rate limit hit', {
            remaining: error.metadata.remaining,
            resetIn: error.metadata.resetIn,
          });
          
          // Call rate limit callback if provided
          if (options?.onRateLimit) {
            options.onRateLimit(error);
          }
          
          throw error;
        }

        // Fallback to demo results
        logger.warn('API failed, falling back to demo results', {
          error: (error as Error).message,
        });
        
        return generateDemoResults(cleanUsername);
      }
    },
    
    onSuccess: (data) => {
      logger.info('Instagram analysis completed', {
        username: data.profile.username,
        score: data.insights.overallScore,
      });
      
      if (options?.onSuccess) {
        options.onSuccess(data);
      }
    },
    
    onError: (error) => {
      logger.error('Instagram analysis error', error as Error);
      
      if (options?.onError) {
        options.onError(error as Error);
      }
    },
  });
}

export default useInstagramAnalysis;
