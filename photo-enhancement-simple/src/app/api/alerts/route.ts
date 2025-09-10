/**
 * Alerting API endpoint
 * 
 * Provides endpoints for managing and monitoring the alerting system:
 * - GET: Get alerting system status and active alerts
 * - POST: Manually trigger alert checks or resolve alerts
 * 
 * This endpoint is useful for:
 * - Monitoring dashboard integration
 * - Manual alert management
 * - Debugging alerting issues
 * - Health check integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertManager } from '@/lib/alerting';
import { logger } from '@/lib/logger';

/**
 * GET /api/alerts
 * 
 * Returns the current alerting system status including:
 * - Active alerts
 * - Alert rules configuration
 * - Recent metrics
 * - System health
 */
export async function GET(request: NextRequest) {
  try {
    const correlationId = request.headers.get('x-correlation-id') || `alerts-${Date.now()}`;
    
    logger.info('Alerting status requested', {
      correlationId,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Get alerting system status
    const status = alertManager.getStatus();
    const activeAlerts = alertManager.getActiveAlerts();
    const rules = alertManager.getRules();

    const response = {
      status: 'success',
      data: {
        system: {
          status: 'operational',
          timestamp: new Date().toISOString(),
          ...status
        },
        activeAlerts: activeAlerts.map(alert => ({
          id: alert.id,
          ruleId: alert.ruleId,
          severity: alert.severity,
          message: alert.message,
          timestamp: new Date(alert.timestamp).toISOString(),
          resolved: alert.resolved,
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : null
        })),
        rules: rules.map(rule => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          enabled: rule.enabled,
          condition: rule.condition
        }))
      },
      correlationId
    };

    logger.info('Alerting status retrieved', {
      correlationId,
      activeAlertsCount: activeAlerts.length,
      rulesCount: rules.length,
      enabledRules: status.enabledRules
    });

    return NextResponse.json(response);
  } catch (error) {
    const correlationId = request.headers.get('x-correlation-id') || `alerts-error-${Date.now()}`;
    
    logger.error('Failed to get alerting status', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve alerting status',
        correlationId
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts
 * 
 * Handles alert management actions:
 * - check: Manually trigger alert rule evaluation
 * - resolve: Resolve a specific alert
 * - test: Test alert system functionality
 */
export async function POST(request: NextRequest) {
  try {
    const correlationId = request.headers.get('x-correlation-id') || `alerts-action-${Date.now()}`;
    const body = await request.json();
    const { action, alertId, ruleId } = body;

    logger.info('Alert action requested', {
      correlationId,
      action,
      alertId,
      ruleId,
      userAgent: request.headers.get('user-agent')
    });

    let result: any = { success: false };

    switch (action) {
      case 'check':
        // Manually trigger alert checks
        await alertManager.checkAlerts();
        result = {
          success: true,
          message: 'Alert checks triggered successfully',
          timestamp: new Date().toISOString()
        };
        break;

      case 'resolve':
        // Resolve a specific alert
        if (!alertId) {
          return NextResponse.json(
            {
              status: 'error',
              message: 'Alert ID is required for resolve action',
              correlationId
            },
            { status: 400 }
          );
        }
        
        const resolved = alertManager.resolveAlert(alertId);
        result = {
          success: resolved,
          message: resolved ? 'Alert resolved successfully' : 'Alert not found or already resolved',
          alertId
        };
        break;

      case 'test':
        // Test alert system by creating a test alert
        const testError = new Error('Test alert - system functionality check');
        await alertManager.reportCriticalError(testError, {
          test: true,
          correlationId,
          timestamp: new Date().toISOString()
        });
        
        result = {
          success: true,
          message: 'Test alert created successfully',
          timestamp: new Date().toISOString()
        };
        break;

      default:
        return NextResponse.json(
          {
            status: 'error',
            message: `Unknown action: ${action}. Supported actions: check, resolve, test`,
            correlationId
          },
          { status: 400 }
        );
    }

    logger.info('Alert action completed', {
      correlationId,
      action,
      success: result.success,
      message: result.message
    });

    return NextResponse.json({
      status: 'success',
      data: result,
      correlationId
    });

  } catch (error) {
    const correlationId = request.headers.get('x-correlation-id') || `alerts-action-error-${Date.now()}`;
    
    logger.error('Failed to execute alert action', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to execute alert action',
        correlationId
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/alerts
 * 
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-correlation-id',
    },
  });
}