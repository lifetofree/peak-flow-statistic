# Rate Limiting Implementation

## Overview

Rate limiting has been implemented on all API routes to prevent abuse and ensure fair usage of the system.

## Configuration

### Patient Routes (`/api/u/:token/*`)
- **Limit**: 100 requests per 15 minutes per IP
- **Routes affected**:
  - `GET /api/u/:token`
  - `GET /api/u/:token/entries`
  - `POST /api/u/:token/entries`
  - `GET /api/u/:token/export`

### Admin Routes (`/api/admin/*`)
- **Limit**: 300 requests per 15 minutes per IP
- **Routes affected**:
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `GET /api/admin/users/:id`
  - `PATCH /api/admin/users/:id`
  - `DELETE /api/admin/users/:id`
  - `PATCH /api/admin/users/:id/note`
  - `GET /api/admin/users/:id/export`
  - `GET /api/admin/entries`
  - `PATCH /api/admin/entries/:id`
  - `DELETE /api/admin/entries/:id`
  - `GET /api/admin/audit`

## Implementation Details

### Storage
- Uses Cloudflare KV for distributed rate limit tracking
- Key format: `ratelimit:{ip}:{path}`
- Stores array of request timestamps
- Automatic expiration after 15 minutes

### Response Headers

All API responses include these headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

### Rate Limit Exceeded

When a client exceeds the limit:
- HTTP status: `429 Too Many Requests`
- Response body: `{ "error": "Too many requests", "code": "RATE_LIMIT_EXCEEDED" }`
- Additional header: `Retry-After` (seconds until window resets)

## IP Detection

The rate limiter uses the following IP sources in order:
1. `cf-connecting-ip` header (Cloudflare)
2. `x-forwarded-for` header (first IP)
3. `x-real-ip` header
4. Falls back to `"unknown"` if none available

## Testing

Unit tests are located in `worker/src/__tests__/rate-limit.test.ts`:
- Tests patient rate limiting (100 req/15min)
- Tests admin rate limiting (300 req/15min)
- Verifies correct headers are set
- Verifies 429 responses when limits exceeded

Run tests:
```bash
cd worker
npm test
```

## Deployment Requirements

### Before First Deployment

For each environment (dev, staging, production), create a KV namespace:

```bash
# Local dev
npx wrangler kv:namespace create "RATE_LIMIT" --preview

# Staging
npx wrangler kv:namespace create "RATE_LIMIT" --preview

# Production
npx wrangler kv:namespace create "RATE_LIMIT"
```

### Update Configuration Files

Copy the returned `id` (and `preview_id` for dev/staging) to the respective `wrangler*.toml` file:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "your-namespace-id"
preview_id = "your-preview-namespace-id"  # dev/staging only
```

### Example: `wrangler.dev.toml`
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "YOUR_DEV_RATE_LIMIT_KV_ID"
preview_id = "YOUR_DEV_RATE_LIMIT_PREVIEW_ID"
```

## Monitoring

Monitor rate limit effectiveness by checking:
- Error logs for 429 responses
- KV usage in Cloudflare dashboard
- X-RateLimit headers in API responses

## Future Enhancements

Potential improvements:
- Per-user rate limits (in addition to IP-based)
- Different limits for read vs write operations
- Configurable rate limits per environment
- Rate limit analytics dashboard
- Whitelist for trusted IPs
