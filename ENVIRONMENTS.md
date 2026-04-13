# Environment Configuration

This project uses separate configurations for local, staging, and production environments.

## Environments

| Environment | Frontend URL | API URL | Database |
|-------------|--------------|---------|----------|
| Local | http://localhost:5173 | http://localhost:8787 | `peakflowstat-db-dev` |
| Staging | https://staging.peakflowstat.allergyclinic.cc | https://api-staging.peakflowstat.allergyclinic.cc | `peakflowstat-db-staging` |
| Production | https://peakflowstat.allergyclinic.cc | https://api.peakflowstat.allergyclinic.cc | `peakflowstat-db` |

## Frontend Environment Variables

Frontend uses Vite's environment mode system. Create `.env.{mode}` files:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

### Example `.env.development`
```env
VITE_API_URL=http://localhost:8787/api
```

### Example `.env.production`
```env
VITE_API_URL=https://api.peakflowstat.allergyclinic.cc/api
```

## Worker Environment Variables

Worker uses separate Wrangler config files:

- `wrangler.dev.toml` - Local development
- `wrangler.staging.toml` - Staging environment
- `wrangler.toml` - Production environment (default)

## Setup Staging Environment

### 1. Create Staging D1 Database
```bash
cd worker
npx wrangler d1 create peakflowstat-db-staging
```

### 1.5. Create Staging KV Namespace for Rate Limiting
```bash
cd worker
npx wrangler kv:namespace create "RATE_LIMIT" --preview
```

Copy the returned `id` and `preview_id` and update `wrangler.staging.toml`.

### 2. Update Database ID and KV Namespace
Copy the returned `database_id` and update `wrangler.staging.toml`.
Copy the returned KV `id` and `preview_id` and update `wrangler.staging.toml`.

### 3. Run Schema and Seed
```bash
npx wrangler d1 execute peakflowstat-db-staging --file=./migrations/0001_schema.sql --remote --config wrangler.staging.toml
npx wrangler d1 execute peakflowstat-db-staging --file=./migrations/0002_seed.sql --remote --config wrangler.staging.toml
```

### 4. Deploy Staging Worker
```bash
cd worker
npm run deploy:staging
```

### 5. Deploy Staging Frontend
```bash
cd frontend
npm run build:staging
npx wrangler pages deploy dist --project-name=peakflowstat-staging --branch=staging
```

## Setup Production Environment

### Create Production KV Namespace for Rate Limiting (One-time Setup)
```bash
cd worker
npx wrangler kv:namespace create "RATE_LIMIT"
```

Copy the returned `id` and update `wrangler.toml`.

## Local Development

### Create Local KV Namespace (One-time Setup)
```bash
cd worker
npx wrangler kv:namespace create "RATE_LIMIT" --preview
```

Copy the returned `id` and `preview_id` and update `wrangler.dev.toml`.

### Start Worker (Local)
```bash
cd worker
npm run dev
```

This starts the worker at `http://localhost:8787` using `wrangler.dev.toml`.

### Start Frontend (Local)
```bash
cd frontend
npm run dev
```

This starts the frontend at `http://localhost:5173` using `.env.development`.

## Deployment Commands

### Worker
```bash
cd worker
npm run deploy          # Production
npm run deploy:dev      # Development (if needed)
npm run deploy:staging  # Staging
```

### Frontend
```bash
cd frontend
npm run build           # Production
npm run build:staging   # Staging
# Then deploy manually with wrangler pages deploy
```

## Environment-Specific Settings

### Development
- CORS allows `http://localhost:5173`
- Uses local D1 database
- No custom domain required

### Staging
- CORS allows `https://staging.peakflowstat.allergyclinic.cc`
- Uses staging D1 database
- Uses `api-staging.peakflowstat.allergyclinic.cc`

### Production
- CORS allows `https://peakflowstat.allergyclinic.cc`
- Uses production D1 database
- Uses `api.peakflowstat.allergyclinic.cc`
