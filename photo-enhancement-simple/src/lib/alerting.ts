/**
 * Alerting system for photo enhancement application
 * 
 * This module provides comprehensive alerting for critical errors,
 * high error rates, and service degradation. It integrates with
 * existing monitoring infrastructure including Sentry, metrics,
 * and logging systems.
 * 
 * Features:
 * - Error rate monitoring and thresholds
 * - Service health degradation detection
 * - Critical error pattern detection
 * - Integration with external alerting services
 * - Configurable alert rules and thresholds
 * 
 * @example
 * ```typescript
 * import { alertManager } from '@/lib/alerting';
 * 
 * // Check error rates and trigger alerts if needed
 * await alertManager.checkErrorRates();
 * 
 * // Report a critical error
 * await alertManager.reportCriticalError(error, context);
 * ```
 * 
 * @module Alerting
 */

import { logger } from './logger';
import { EnhancementMetrics, UploadMetrics } from './metrics';
import { captureException } from '@sentry/nextjs';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  actions: AlertAction[];
}

export interface AlertCondition {
  type: 'error_rate' | 'service_health' | 'critical_error' | 'response_time' | 'queue_size';
  threshold: number;
  timeWindowMinutes: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  metric?: string;
}

export interface AlertAction {
  type: 'log' | 'sentry' | 'webhook' | 'email';
  config: Record<string, unknown>;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  timestamp: number;
  severity: string;
  message: string;
  context: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: number;
}

// Default alert rules
const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high-upload-error-rate',
    name: 'High Upload Error Rate',
    description: 'Upload error rate exceeds 10% over 5 minutes',
    condition: {
      type: 'error_rate',
      threshold: 0.1, // 10%
      timeWindowMinutes: 5,
      operator: 'gt',
      metric: 'upload_errors'
    },
    severity: 'high',
    enabled: true,
    cooldownMinutes: 15,
    actions: [
      { type: 'log', config: { level: 'error' } },
      { type: 'sentry', config: { level: 'error' } }
    ]
  },
  {
    id: 'high-enhancement-error-rate',
    name: 'High Enhancement Error Rate',
    description: 'Enhancement error rate exceeds 15% over 10 minutes',
    condition: {
      type: 'error_rate',
      threshold: 0.15, // 15%
      timeWindowMinutes: 10,
      operator: 'gt',
      metric: 'enhancement_errors'
    },
    severity: 'high',
    enabled: true,
    cooldownMinutes: 20,
    actions: [
      { type: 'log', config: { level: 'error' } },
      { type: 'sentry', config: { level: 'error' } }
    ]
  },
  {
    id: 'database-connection-failure',
    name: 'Database Connection Failure',
    description: 'Database health check failures',
    condition: {
      type: 'service_health',
      threshold: 1,
      timeWindowMinutes: 1,
      operator: 'gte'
    },
    severity: 'critical',
    enabled: true,
    cooldownMinutes: 5,
    actions: [
      { type: 'log', config: { level: 'error' } },
      { type: 'sentry', config: { level: 'fatal' } }
    ]
  },
  {
    id: 'gemini-api-failure',
    name: 'Gemini API Service Failure',
    description: 'Gemini API health check failures',
    condition: {
      type: 'service_health',
      threshold: 3,
      timeWindowMinutes: 5,
      operator: 'gte'
    },
    severity: 'critical',
    enabled: true,
    cooldownMinutes: 10,
    actions: [
      { type: 'log', config: { level: 'error' } },
      { type: 'sentry', config: { level: 'error' } }
    ]
  },
  {
    id: 'slow-response-times',
    name: 'Slow API Response Times',
    description: 'Average response time exceeds 5 seconds',
    condition: {
      type: 'response_time',
      threshold: 5000, // 5 seconds in ms
      timeWindowMinutes: 10,
      operator: 'gt'
    },
    severity: 'medium',
    enabled: true,
    cooldownMinutes: 30,
    actions: [
      { type: 'log', config: { level: 'warn' } },
      { type: 'sentry', config: { level: 'warning' } }
    ]
  }
];

class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  private metrics: {
    uploadErrors: number[];
    enhancementErrors: number[];
    responseTimes: number[];
    serviceFailures: Map<string, number[]>;
  } = {
    uploadErrors: [],
    enhancementErrors: [],
    responseTimes: [],
    serviceFailures: new Map()
  };

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Load default alert rules
   */
  private loadDefaultRules(): void {
    DEFAULT_ALERT_RULES.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    logger.info('Alert rules loaded', {
      rulesCount: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length
    });
  }

  /**
   * Add or update an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added/updated', { ruleId: rule.id, ruleName: rule.name });
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.info('Alert rule removed', { ruleId });
    }
    return removed;
  }

  /**
   * Get all alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Record an upload error for monitoring
   */
  recordUploadError(): void {
    const now = Date.now();
    this.metrics.uploadErrors.push(now);
    this.cleanupOldMetrics();
  }

  /**
   * Record an enhancement error for monitoring
   */
  recordEnhancementError(): void {
    const now = Date.now();
    this.metrics.enhancementErrors.push(now);
    this.cleanupOldMetrics();
  }

  /**
   * Record response time for monitoring
   */
  recordResponseTime(timeMs: number): void {
    const now = Date.now();
    this.metrics.responseTimes.push(timeMs);
    this.cleanupOldMetrics();
  }

  /**
   * Record service failure for monitoring
   */
  recordServiceFailure(serviceName: string): void {
    const now = Date.now();
    if (!this.metrics.serviceFailures.has(serviceName)) {
      this.metrics.serviceFailures.set(serviceName, []);
    }
    this.metrics.serviceFailures.get(serviceName)!.push(now);
    this.cleanupOldMetrics();
  }

  /**
   * Clean up old metrics data (keep only last 24 hours)
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    this.metrics.uploadErrors = this.metrics.uploadErrors.filter(t => t > cutoff);
    this.metrics.enhancementErrors = this.metrics.enhancementErrors.filter(t => t > cutoff);
    this.metrics.responseTimes = this.metrics.responseTimes.filter(t => t > cutoff);
    
    for (const [service, times] of this.metrics.serviceFailures.entries()) {
      this.metrics.serviceFailures.set(service, times.filter(t => t > cutoff));
    }
  }

  /**
   * Check all alert rules and trigger alerts if conditions are met
   */
  async checkAlerts(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateRule(rule);
        if (shouldAlert) {
          await this.triggerAlert(rule);
        }
      } catch (error) {
        logger.error('Error evaluating alert rule', {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Evaluate if an alert rule condition is met
   */
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    const { condition } = rule;
    const now = Date.now();
    const windowStart = now - (condition.timeWindowMinutes * 60 * 1000);

    switch (condition.type) {
      case 'error_rate': {
        const errorCount = this.getErrorCountInWindow(condition.metric!, windowStart, now);
        const totalCount = this.getTotalCountInWindow(condition.metric!, windowStart, now);
        const errorRate = totalCount > 0 ? errorCount / totalCount : 0;
        return this.compareValues(errorRate, condition.threshold, condition.operator);
      }

      case 'service_health': {
        // Check recent service failures
        let totalFailures = 0;
        for (const failures of this.metrics.serviceFailures.values()) {
          totalFailures += failures.filter(t => t >= windowStart).length;
        }
        return this.compareValues(totalFailures, condition.threshold, condition.operator);
      }

      case 'response_time': {
        const recentTimes = this.metrics.responseTimes.filter(t => t >= windowStart);
        if (recentTimes.length === 0) return false;
        const avgResponseTime = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
        return this.compareValues(avgResponseTime, condition.threshold, condition.operator);
      }

      default:
        return false;
    }
  }

  /**
   * Get error count in time window
   */
  private getErrorCountInWindow(metric: string, start: number, end: number): number {
    switch (metric) {
      case 'upload_errors':
        return this.metrics.uploadErrors.filter(t => t >= start && t <= end).length;
      case 'enhancement_errors':
        return this.metrics.enhancementErrors.filter(t => t >= start && t <= end).length;
      default:
        return 0;
    }
  }

  /**
   * Get total count in time window (simplified - would need actual request tracking)
   */
  private getTotalCountInWindow(metric: string, start: number, end: number): number {
    // For now, estimate based on error count (in production, track all requests)
    const errorCount = this.getErrorCountInWindow(metric, start, end);
    return Math.max(errorCount * 10, 1); // Assume 10% error rate as baseline
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return actual > threshold;
      case 'gte': return actual >= threshold;
      case 'lt': return actual < threshold;
      case 'lte': return actual <= threshold;
      case 'eq': return actual === threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert if not in cooldown period
   */
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const now = Date.now();
    const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;

    if (now - lastAlertTime < cooldownMs) {
      return; // Still in cooldown period
    }

    const alertEvent: AlertEvent = {
      id: `${rule.id}-${now}`,
      ruleId: rule.id,
      timestamp: now,
      severity: rule.severity,
      message: `Alert: ${rule.name} - ${rule.description}`,
      context: {
        ruleName: rule.name,
        condition: rule.condition,
        timestamp: new Date(now).toISOString()
      },
      resolved: false
    };

    this.activeAlerts.set(alertEvent.id, alertEvent);
    this.lastAlertTimes.set(rule.id, now);

    // Execute alert actions
    for (const action of rule.actions) {
      await this.executeAlertAction(action, alertEvent);
    }

    logger.warn('Alert triggered', {
      alertId: alertEvent.id,
      ruleId: rule.id,
      severity: rule.severity,
      message: alertEvent.message
    });
  }

  /**
   * Execute an alert action
   */
  private async executeAlertAction(action: AlertAction, alert: AlertEvent): Promise<void> {
    try {
      switch (action.type) {
        case 'log':
          const level = action.config.level as string || 'error';
          if (level === 'error') {
            logger.error(alert.message, alert.context);
          } else if (level === 'warn') {
            logger.warn(alert.message, alert.context);
          } else {
            logger.info(alert.message, alert.context);
          }
          break;

        case 'sentry':
          const sentryLevel = action.config.level as string || 'error';
          captureException(new Error(alert.message), {
            level: sentryLevel as any,
            tags: {
              alertId: alert.id,
              ruleId: alert.ruleId,
              severity: alert.severity
            },
            extra: alert.context
          });
          break;

        case 'webhook':
          // Implement webhook notification if needed
          logger.info('Webhook alert action not implemented', { alert: alert.id });
          break;

        case 'email':
          // Implement email notification if needed
          logger.info('Email alert action not implemented', { alert: alert.id });
          break;

        default:
          logger.warn('Unknown alert action type', { actionType: action.type });
      }
    } catch (error) {
      logger.error('Failed to execute alert action', {
        actionType: action.type,
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Resolve an active alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      logger.info('Alert resolved', { alertId, ruleId: alert.ruleId });
      return true;
    }
    return false;
  }

  /**
   * Report a critical error that should trigger immediate alerts
   */
  async reportCriticalError(error: Error, context: Record<string, unknown> = {}): Promise<void> {
    const criticalAlert: AlertEvent = {
      id: `critical-${Date.now()}`,
      ruleId: 'critical-error',
      timestamp: Date.now(),
      severity: 'critical',
      message: `Critical Error: ${error.message}`,
      context: {
        error: error.message,
        stack: error.stack,
        ...context
      },
      resolved: false
    };

    this.activeAlerts.set(criticalAlert.id, criticalAlert);

    // Immediate actions for critical errors
    await this.executeAlertAction(
      { type: 'log', config: { level: 'error' } },
      criticalAlert
    );
    
    await this.executeAlertAction(
      { type: 'sentry', config: { level: 'fatal' } },
      criticalAlert
    );

    logger.error('Critical error reported', {
      alertId: criticalAlert.id,
      error: error.message,
      context
    });
  }

  /**
   * Get alerting system status
   */
  getStatus(): {
    rulesCount: number;
    enabledRules: number;
    activeAlerts: number;
    recentMetrics: {
      uploadErrors: number;
      enhancementErrors: number;
      avgResponseTime: number;
      serviceFailures: number;
    };
  } {
    const now = Date.now();
    const last5Minutes = now - (5 * 60 * 1000);
    
    const recentUploadErrors = this.metrics.uploadErrors.filter(t => t >= last5Minutes).length;
    const recentEnhancementErrors = this.metrics.enhancementErrors.filter(t => t >= last5Minutes).length;
    const recentResponseTimes = this.metrics.responseTimes.filter(t => t >= last5Minutes);
    const avgResponseTime = recentResponseTimes.length > 0 
      ? recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length 
      : 0;
    
    let totalServiceFailures = 0;
    for (const failures of this.metrics.serviceFailures.values()) {
      totalServiceFailures += failures.filter(t => t >= last5Minutes).length;
    }

    return {
      rulesCount: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      activeAlerts: this.getActiveAlerts().length,
      recentMetrics: {
        uploadErrors: recentUploadErrors,
        enhancementErrors: recentEnhancementErrors,
        avgResponseTime,
        serviceFailures: totalServiceFailures
      }
    };
  }
}

// Global alert manager instance
export const alertManager = new AlertManager();

// Start periodic alert checking (every 2 minutes)
if (typeof window === 'undefined') { // Server-side only
  setInterval(async () => {
    try {
      await alertManager.checkAlerts();
    } catch (error) {
      logger.error('Error during periodic alert check', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, 2 * 60 * 1000); // 2 minutes
}