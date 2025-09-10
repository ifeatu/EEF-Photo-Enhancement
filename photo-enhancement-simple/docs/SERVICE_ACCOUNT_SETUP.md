# Service Account Authentication Setup

This document provides instructions for setting up password-based authentication for service accounts in production to enable secure troubleshooting access.

## Overview

The service account authentication system supports three authentication methods:
1. **Bearer Token Authentication** - For automated services
2. **Basic Authentication** - Username/password for human operators
3. **API Key Authentication** - For monitoring and external tools

## Environment Variables Setup

The setup script has generated the following credentials. Add these to your Vercel production environment:

### 1. Service Tokens
```bash
vercel env add SERVICE_TOKENS
```
Paste this value:
```json
{"admin-prod":{"name":"Production Admin","secret":"675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471","permissions":["admin:write"],"createdAt":"2025-09-10T20:51:25.719Z"}}
```

### 2. Service Accounts (Username/Password)
```bash
vercel env add SERVICE_ACCOUNTS
```
Paste this value:
```json
{"admin-user":{"name":"Admin User","username":"ifeatu","passwordHash":"c2cbc3df1151359f31013323d57ff44d1552c1725e371425c8802f4f0a133084","permissions":["admin:write"],"createdAt":"2025-09-10T20:52:10.134Z"}}
```

### 3. API Keys
```bash
vercel env add SERVICE_API_KEYS
```
Paste this value:
```json
{"monitoring-key":{"name":"Monitoring Service","keyHash":"aa2e2a7998408fefa209a9cc366defbfe74399a1fe929ffa0a3d488fbd5363b1","permissions":["admin:write"],"createdAt":"2025-09-10T20:52:37.522Z"}}
```

### 4. Auth Salt
```bash
vercel env add SERVICE_AUTH_SALT
```
Paste this value:
```
3d24448aaf54832d1ae342a8aba98d6a79993b2c034070f2d37cb73b2bb1d79b
```

## Authentication Methods

### Bearer Token Authentication
```bash
curl -H "Authorization: Bearer 675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471" \
     https://photoenhance.dev/api/debug
```

### Basic Authentication
```bash
# Username: ifeatu
# Password: (generated during setup)
curl -u "ifeatu:password" https://photoenhance.dev/api/debug
```

### API Key Authentication
```bash
# Via header
curl -H "X-API-Key: aa2e2a7998408fefa209a9cc366defbfe74399a1fe929ffa0a3d488fbd5363b1" \
     https://photoenhance.dev/api/debug

# Via query parameter
curl "https://photoenhance.dev/api/debug?api_key=aa2e2a7998408fefa209a9cc366defbfe74399a1fe929ffa0a3d488fbd5363b1"
```

## Protected Endpoints

### Debug Endpoint
- **URL**: `/api/debug`
- **Permissions**: `debug:read`
- **Purpose**: System diagnostics and health checks
- **Returns**: Database status, service connectivity, system metrics

### Admin Endpoint
- **URL**: `/api/admin`
- **Permissions**: `admin:write`
- **Purpose**: Administrative operations and system management
- **Returns**: User statistics, service status, system information

## Security Features

### Rate Limiting
- Failed authentication attempts are rate limited
- Prevents brute force attacks
- Configurable limits per IP address

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)

### Permission System
- Role-based access control
- Granular permissions (e.g., `debug:read`, `admin:write`)
- Least privilege principle

### Development Mode
- Authentication bypassed in development environment
- Automatic fallback for local testing
- Clear indication of development mode in responses

## Deployment Steps

1. **Set Environment Variables**:
   ```bash
   # Run these commands in your project directory
   vercel env add SERVICE_TOKENS
   vercel env add SERVICE_ACCOUNTS
   vercel env add SERVICE_API_KEYS
   vercel env add SERVICE_AUTH_SALT
   ```

2. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

3. **Test Authentication**:
   ```bash
   # Test debug endpoint
   curl -H "Authorization: Bearer 675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471" \
        https://photoenhance.dev/api/debug
   
   # Test admin endpoint
   curl -H "Authorization: Bearer 675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471" \
        https://photoenhance.dev/api/admin
   ```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check that environment variables are set correctly
   - Verify the token/credentials are valid
   - Ensure the endpoint requires the correct permissions

2. **500 Internal Server Error**
   - Check server logs for authentication middleware errors
   - Verify environment variables are properly formatted JSON
   - Ensure all required dependencies are installed

3. **Rate Limiting (429)**
   - Wait before retrying authentication
   - Check for multiple failed attempts from the same IP
   - Consider implementing exponential backoff

### Debug Commands

```bash
# Check environment variables
vercel env ls

# View deployment logs
vercel logs

# Test health endpoint (no auth required)
curl https://photoenhance.dev/api/health
```

## Security Best Practices

1. **Credential Management**
   - Store credentials securely (never in code)
   - Rotate tokens regularly
   - Use different credentials for different environments

2. **Access Control**
   - Follow least privilege principle
   - Regularly audit permissions
   - Monitor authentication logs

3. **Network Security**
   - Use HTTPS only
   - Implement proper CORS policies
   - Consider IP whitelisting for admin access

4. **Monitoring**
   - Log all authentication attempts
   - Set up alerts for failed authentications
   - Monitor for unusual access patterns

## Credential Rotation

To rotate credentials:

1. **Generate New Credentials**:
   ```bash
   node scripts/setup-service-accounts.js
   ```

2. **Update Environment Variables**:
   ```bash
   vercel env rm SERVICE_TOKENS
   vercel env add SERVICE_TOKENS
   # Paste new token value
   ```

3. **Deploy Changes**:
   ```bash
   vercel --prod
   ```

4. **Update Client Applications**:
   - Update any scripts or tools using the old credentials
   - Test all integrations with new credentials

## Support

For issues with service account authentication:
1. Check the deployment logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Test with the debug endpoint first
4. Review the authentication middleware logs

---

**Generated on**: 2025-01-10
**Script Version**: 1.0.0
**Last Updated**: Service account setup complete