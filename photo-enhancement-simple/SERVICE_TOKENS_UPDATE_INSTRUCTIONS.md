# SERVICE_TOKENS Update Instructions

## Issue Summary
The admin service account currently has `admin:write` permissions, but the debug endpoint requires `debug:read` permissions. This causes a 403 Forbidden error when trying to access `/api/debug`.

## Current Status
- Debug endpoint returns 404 in production (endpoint may not be deployed)
- Admin account has insufficient permissions for debug access
- Need to update SERVICE_TOKENS to include both permissions

## Generated SERVICE_TOKENS Configuration

```json
{"admin-prod":{"name":"Production Admin","secret":"675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471","permissions":["admin:write","debug:read"],"createdAt":"2025-09-11T12:31:58.113Z"}}
```

## Manual Update Steps

1. **Go to Vercel Dashboard**
   - Navigate to your project: https://vercel.com/dashboard
   - Select the PhotoEnhance project

2. **Update Environment Variable**
   - Go to Settings > Environment Variables
   - Find `SERVICE_TOKENS`
   - Click "Edit"
   - Replace the current value with the JSON configuration above
   - Save the changes

3. **Redeploy**
   - Go to Deployments tab
   - Click "Redeploy" on the latest deployment
   - Wait for deployment to complete

## Test Commands (After Update)

```bash
# Test with service account token
curl -H "Authorization: Bearer sa_6bd077611a57edbf1fb9ec066d6c356bbe3874f7de8b36190f2cf4370cb8031b" \
  https://photoenhance-frontend-bz1t6mwfb-pierre-malbroughs-projects.vercel.app/api/debug

# Test with raw secret (backward compatibility)
curl -H "Authorization: Bearer 675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471" \
  https://photoenhance-frontend-bz1t6mwfb-pierre-malbroughs-projects.vercel.app/api/debug
```

## Expected Result
After the update, both commands should return debug information instead of 403/404 errors.

## Notes
- The new configuration maintains backward compatibility
- Admin account will have both `admin:write` and `debug:read` permissions
- No code changes required, only environment variable update