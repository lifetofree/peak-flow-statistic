# 🚀 Cloudflare Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. Code Status
- [x] All changes committed to main branch
- [x] Frontend builds successfully
- [x] Worker starts without errors
- [x] All tests passing (12/12)

### 2. Environment Variables
**Worker (Production) - Already configured in wrangler.toml:**
```toml
[vars]
ENVIRONMENT = "production"
CORS_ORIGIN = "https://peakflowstat.allergyclinic.cc,https://main.peakflowstat.pages.dev"
FRONTEND_URL = "https://peakflowstat.allergyclinic.cc"
```

**Frontend (Production) - Already configured in .env.production:**
```env
VITE_API_URL=https://api.peakflowstat.allergyclinic.cc/api
```

### 3. Database Configuration
- [x] Production D1 database ID: `812f290e-51dc-433b-a2d8-4156dadd72d0`
- [x] Schema applied
- [x] Data seeded (if needed)

### 4. Domain Configuration
- [x] Frontend: https://peakflowstat.allergyclinic.cc
- [x] API: https://api.peakflowstat.allergyclinic.cc
- [x] DNS configured (A/CNAME records)
- [x] SSL/TLS certificates active

## 📦 Deployment Steps

### Step 1: Commit All Changes (REQUIRED)
```bash
cd /Users/lifetofree/Documents/Projects/PeakFlowStat

# Commit deployment documentation and .gitignore updates
git add .
git commit -m "docs: add deployment documentation and testing guide

- DEPLOYMENT_SUCCESS.md: Complete deployment summary
- TESTING_GUIDE.md: Comprehensive testing instructions
- .gitignore: Add worker-configuration.d.ts to ignore list

Ready for production deployment to Cloudflare"
```

### Step 2: Push to GitHub (REQUIRED)
```bash
git push origin main
```

### Step 3: Deploy Worker to Cloudflare (REQUIRED)
```bash
cd /Users/lifetofree/Documents/Projects/PeakFlowStat/worker

# Deploy to production
npm run deploy
```

**Expected Output:**
```
⛅️ wrangler 3.114.17
Total Upload: 123.45 KiB / gzip: 45.67 KiB
Published peakflowstat-api
   https://api.peakflowstat.allergyclinic.cc
   Current Version ID: <version-id>
```

### Step 4: Verify Worker Deployment (REQUIRED)
```bash
# Test health endpoint
curl https://api.peakflowstat.allergyclinic.cc/api/health

# Expected: {"status":"ok","db":"connected"}
```

### Step 5: Build Frontend (REQUIRED)
```bash
cd /Users/lifetofree/Documents/Projects/PeakFlowStat/frontend

# Build for production
npm run build
```

**Expected Output:**
```
vite v6.4.2 building for production...
✓ built in 1.76s
```

### Step 6: Deploy Frontend to Cloudflare Pages (REQUIRED)

**Option A: Via CLI (if configured)**
```bash
npx wrangler pages deploy dist --project-name=peakflowstat
```

**Option B: Via GitHub CI/CD (automatic)**
- Push to main branch triggers automatic deployment via GitHub Actions
- Check GitHub Actions: https://github.com/lifetofree/peak-flow-statistic/actions

**Option C: Via Cloudflare Dashboard (manual)**
1. Go to https://dash.cloudflare.com/
2. Navigate to Workers & Pages
3. Select "peakflowstat" Pages project
4. Click "Create deployment" → "Upload assets"
5. Upload the `dist/` folder

### Step 7: Verify Frontend Deployment (REQUIRED)
```bash
# Test frontend loads
curl https://peakflowstat.allergyclinic.cc/

# Expected: HTML with peakflowstat content
```

## 🧪 Post-Deployment Testing

### Test 1: Health Check
```bash
curl https://api.peakflowstat.allergyclinic.cc/api/health
# Expected: {"status":"ok","db":"connected"}
```

### Test 2: Admin Users Pagination
```bash
curl "https://api.peakflowstat.allergyclinic.cc/api/admin/users?page=1"
# Expected: {"users":[...],"total":X,"page":1,"pageSize":20}
```

### Test 3: Admin Entries Pagination (pageSize=80)
```bash
curl "https://api.peakflowstat.allergyclinic.cc/api/admin/entries?page=1&pageSize=80"
# Expected: {"entries":[...],"total":X,"page":1,"pageSize":80}
```

### Test 4: User Dashboard (List View)
1. Open https://peakflowstat.allergyclinic.cc/admin
2. Click any user
3. Switch to List view
4. Verify 80 entries/page (20 days)

### Test 5: User Dashboard (Card View)
1. Switch to Card view
2. Verify 10 entries/page

### Test 6: Admin User Detail
1. View any user's entries
2. Verify pagination controls work
3. Verify 80 entries/page

## 🔍 Troubleshooting

### Worker Deployment Fails
**Issue:** Authentication error
```bash
# Re-authenticate
npx wrangler login
npm run deploy
```

**Issue:** Database binding error
- Check `wrangler.toml` database_id is correct
- Verify D1 database exists in Cloudflare dashboard

### Frontend Build Fails
**Issue:** TypeScript errors
```bash
# Check for errors
npm run build
# Fix any TypeScript errors
```

**Issue:** Dependency errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Calls Fail in Production
**Issue:** CORS errors
- Check `CORS_ORIGIN` in `wrangler.toml`
- Verify frontend URL is in allowed origins

**Issue:** 404 errors
- Check `FRONTEND_URL` in `wrangler.toml`
- Verify worker routes are configured correctly

### Pagination Not Working
**Issue:** All entries showing
- Check browser console for errors
- Verify API returns pagination metadata
- Check `pageSize` parameter in API calls

**Issue:** Wrong page size
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check API response `pageSize` field

## 📊 Deployment Status

| Component | Status | URL |
|-----------|--------|-----|
| GitHub | ✅ Ready | https://github.com/lifetofree/peak-flow-statistic |
| Worker | ⏳ Pending | https://api.peakflowstat.allergyclinic.cc |
| Frontend | ⏳ Pending | https://peakflowstat.allergyclinic.cc |

## 🎯 Quick Deployment Commands

```bash
# One-liner to deploy everything
cd /Users/lifetofree/Documents/Projects/PeakFlowStat && \
git add . && \
git commit -m "docs: add deployment documentation and testing guide" && \
git push origin main && \
cd worker && \
npm run deploy && \
cd ../frontend && \
npm run build && \
echo "✅ Ready to deploy frontend via Cloudflare Pages"
```

## ⚠️ Important Notes

1. **Always commit before deploying** - Ensures version history
2. **Test worker first** - Backend must be live before frontend
3. **Clear browser cache** - Users may see old version without cache clear
4. **Monitor logs** - Check Cloudflare dashboard for errors
5. **Rollback ready** - Know how to revert if issues occur

## 🔄 Rollback Plan

If deployment fails:

**Rollback Worker:**
```bash
cd worker
npx wrangler rollback
# Or deploy previous version manually
```

**Rollback Frontend:**
- Go to Cloudflare Pages dashboard
- Select previous deployment
- Click "Rollback deployment"

**Rollback Git:**
```bash
git reset --hard HEAD~1
git push origin main --force
```

---

## 📝 Next Steps

1. ✅ Commit changes with deployment docs
2. ✅ Push to GitHub
3. ✅ Deploy Worker to Cloudflare
4. ✅ Verify Worker is live
5. ✅ Build Frontend
6. ✅ Deploy Frontend to Cloudflare Pages
7. ✅ Run post-deployment tests
8. ✅ Monitor production for issues

**Ready to deploy! 🚀**
