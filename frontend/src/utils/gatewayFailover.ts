/**
 * Gateway Failover System for FHEVM - Task Manager
 *
 * NOTE: As of Jan 2026, Zama merged gateway functionality into the relayer.
 * The gateway.testnet.zama.org domain no longer exists.
 * Use relayer.testnet.zama.org which serves the same /v1/keyurl endpoint.
 *
 * Includes health checks, smart retries, and exponential backoff.
 */

import { secureLogger } from './secureLogger';

export interface GatewayEndpoint {
  url: string;
  name: string;
  priority: number;
  lastChecked?: number;
  isHealthy?: boolean;
  errorCount?: number;
}

export interface GatewayHealthCheck {
  endpoint: GatewayEndpoint;
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
}

export class GatewayFailover {
  private endpoints: GatewayEndpoint[] = [
    {
      url: 'https://relayer.testnet.zama.org',
      name: 'Relayer (primary)',
      priority: 1,
      isHealthy: true,
      errorCount: 0
    }
  ];

  private healthCheckCache: Map<string, GatewayHealthCheck> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache
  private readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_ERRORS_BEFORE_MARKING_UNHEALTHY = 3;

  /**
   * Check if a gateway endpoint is healthy
   */
  async checkHealth(endpoint: GatewayEndpoint): Promise<GatewayHealthCheck> {
    const cacheKey = endpoint.url;
    const cached = this.healthCheckCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && endpoint.lastChecked && 
        Date.now() - endpoint.lastChecked < this.CACHE_TTL) {
      return cached;
    }

    const startTime = Date.now();
    let isHealthy = false;
    let error: string | undefined;

    try {
      // Use HEAD request for faster health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);

      const response = await fetch(`${endpoint.url}/v1/keyurl`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Consider healthy if we get any response (even 404 is better than DNS failure)
      isHealthy = response.status < 500; // 2xx, 3xx, 4xx are OK (DNS works)
      
      if (!isHealthy) {
        error = `HTTP ${response.status}`;
      }

      // Update endpoint health status
      endpoint.isHealthy = isHealthy;
      endpoint.lastChecked = Date.now();
      endpoint.errorCount = isHealthy ? 0 : (endpoint.errorCount || 0) + 1;

      const healthCheck: GatewayHealthCheck = {
        endpoint,
        isHealthy,
        responseTime,
        error
      };

      this.healthCheckCache.set(cacheKey, healthCheck);
      return healthCheck;

    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      const errorMessage = err?.message || String(err) || 'Unknown error';
      error = errorMessage;
      
      // DNS failures (ERR_NAME_NOT_RESOLVED) mean endpoint is down
      if (errorMessage.includes('ERR_NAME_NOT_RESOLVED') || 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError')) {
        isHealthy = false;
      } else {
        // Other errors might be transient
        isHealthy = false;
      }

      endpoint.isHealthy = isHealthy;
      endpoint.lastChecked = Date.now();
      endpoint.errorCount = (endpoint.errorCount || 0) + 1;

      const healthCheck: GatewayHealthCheck = {
        endpoint,
        isHealthy,
        responseTime,
        error: error || undefined
      };

      this.healthCheckCache.set(cacheKey, healthCheck);
      return healthCheck;
    }
  }

  /**
   * Check all endpoints and return the healthiest one
   */
  async findHealthyEndpoint(): Promise<GatewayEndpoint | null> {
    secureLogger.debug('[Gateway Failover] 🔍 Checking gateway endpoints...');

    // Check all endpoints in parallel
    const healthChecks = await Promise.all(
      this.endpoints.map(endpoint => this.checkHealth(endpoint))
    );

    // Sort by: health status (healthy first), then priority, then error count
    const sorted = healthChecks.sort((a, b) => {
      if (a.isHealthy !== b.isHealthy) {
        return a.isHealthy ? -1 : 1;
      }
      if (a.endpoint.priority !== b.endpoint.priority) {
        return a.endpoint.priority - b.endpoint.priority;
      }
      return (a.endpoint.errorCount || 0) - (b.endpoint.errorCount || 0);
    });

    const healthy = sorted.find(h => h.isHealthy);
    
    if (healthy) {
      secureLogger.debug(`[Gateway Failover] ✅ Selected: ${healthy.endpoint.name} (${healthy.endpoint.url})`);
      if (healthy.responseTime) {
        secureLogger.debug(`[Gateway Failover] ⚡ Response time: ${healthy.responseTime}ms`);
      }
      return healthy.endpoint;
    }

    // If no healthy endpoint, return the one with lowest error count
    const best = sorted[0];
    secureLogger.warn(`[Gateway Failover] ⚠️ No healthy endpoints found. Using: ${best.endpoint.name}`);
    if (best.error) {
      secureLogger.warn(`[Gateway Failover] ⚠️ Last error: ${best.error}`);
    }
    
    return best.endpoint;
  }

  /**
   * Get the best gateway URL with automatic failover
   */
  async getGatewayUrl(): Promise<string> {
    const endpoint = await this.findHealthyEndpoint();
    return endpoint?.url || 'https://relayer.testnet.zama.org';
  }

  /**
   * Record a failure for an endpoint (for tracking)
   */
  recordFailure(url: string): void {
    const endpoint = this.endpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.errorCount = (endpoint.errorCount || 0) + 1;
      if (endpoint.errorCount && endpoint.errorCount >= this.MAX_ERRORS_BEFORE_MARKING_UNHEALTHY) {
        endpoint.isHealthy = false;
        secureLogger.warn(`[Gateway Failover] ⚠️ Marked ${endpoint.name} as unhealthy after ${endpoint.errorCount} errors`);
      }
    }
  }

  /**
   * Record a success for an endpoint
   */
  recordSuccess(url: string): void {
    const endpoint = this.endpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.isHealthy = true;
      endpoint.errorCount = 0;
      endpoint.lastChecked = Date.now();
    }
  }

  /**
   * Get status of all endpoints
   */
  getStatus(): GatewayEndpoint[] {
    return [...this.endpoints].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Clear health check cache (force re-check)
   */
  clearCache(): void {
    this.healthCheckCache.clear();
    this.endpoints.forEach(e => {
      e.lastChecked = undefined;
    });
  }
}

// Singleton instance
export const gatewayFailover = new GatewayFailover();



