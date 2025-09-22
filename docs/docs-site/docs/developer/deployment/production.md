---
title: "Production Deployment Guide"
type: "guide"
audience: ["developer", "agent"]
contexts: ["deployment", "production", "infrastructure"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["deployment-engineer", "infrastructure-manager"]
related:
  - developer/setup.md
  - developer/deployment/vercel.md
  - developer/deployment/database.md
dependencies: ["vercel", "postgresql", "prisma"]
---

# Production Deployment Guide

Complete guide for deploying ArqCashflow to production with Vercel and PostgreSQL.

## Context for LLM Agents

**Scope**: Production deployment configuration and best practices
**Prerequisites**: Understanding of Next.js deployment, environment variables, database setup
**Key Patterns**:
- Environment-based configuration pattern
- Database migration pattern
- Secret management pattern

## Deployment Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────►│  Next.js    │────►│ PostgreSQL  │
│   (Host)    │     │   (App)     │     │ (Database)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
   [CDN/Edge]        [Serverless]         [Managed DB]
```

## Quick Deploy to Vercel

### 1. Deploy with Vercel Button
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/joselpq/arqcashflow)

### 2. Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Environment Configuration

### Required Environment Variables

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Authentication
NEXTAUTH_SECRET="generate-random-32-char-string"
NEXTAUTH_URL="https://your-domain.vercel.app"

# AI Features (Claude API)
CLAUDE_API_KEY="sk-ant-api03-..."

# Google Sheets Integration (Optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
```

### Setting Environment Variables in Vercel

```bash
# Using Vercel CLI
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add CLAUDE_API_KEY

# Or use Vercel Dashboard
# Project Settings → Environment Variables
```

## Database Setup

### Option 1: Neon (Recommended)
Free PostgreSQL with great Vercel integration:

1. Create account at [neon.tech](https://neon.tech)
2. Create new database
3. Copy connection string
4. Add to Vercel environment variables

### Option 2: Railway
Alternative managed PostgreSQL:

1. Create account at [railway.app](https://railway.app)
2. Create new PostgreSQL service
3. Copy DATABASE_URL from settings
4. Add to Vercel environment

### Option 3: Supabase
PostgreSQL with additional features:

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database
3. Copy connection string
4. Add to Vercel environment

### Database Migration

```bash
# After setting DATABASE_URL
npx prisma migrate deploy
npx prisma generate
```

## Authentication Setup

### Generate NEXTAUTH_SECRET

```bash
# Generate secure secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Configure NEXTAUTH_URL

- Development: `http://localhost:3000`
- Production: `https://your-domain.vercel.app`

## Performance Optimization

### Build Configuration

```json
// next.config.ts
{
  "experimental": {
    "turbo": true
  },
  "images": {
    "domains": ["your-image-domain.com"]
  }
}
```

### Caching Strategy

```typescript
// API Route caching
export const revalidate = 60 // Revalidate every 60 seconds

// Static page generation
export const dynamic = 'force-dynamic' // For dynamic pages
```

## Monitoring & Analytics

### Vercel Analytics
Enable in Vercel Dashboard → Analytics

### Error Tracking (Optional)
```bash
# Sentry integration
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## Security Checklist

### Production Requirements
- [ ] NEXTAUTH_SECRET is set and secure
- [ ] Database uses SSL connection
- [ ] Environment variables are properly set
- [ ] CORS is configured if needed
- [ ] Rate limiting is implemented
- [ ] API keys are kept secure

### Headers Configuration

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
]
```

## Troubleshooting

### Common Issues

#### "CLAUDE_API_KEY not configured"
- Verify environment variable is set in Vercel
- Check variable name spelling
- Ensure no quotes in the value

#### Database Connection Errors
```bash
# Test connection locally
DATABASE_URL="your-production-url" npx prisma db pull
```

#### Build Failures
```bash
# Test production build locally
npm run build
npm start
```

### Debugging Production

```bash
# View Vercel logs
vercel logs

# View function logs
vercel logs --source=lambda

# Check deployment
vercel inspect [deployment-url]
```

## Rollback Strategy

### Instant Rollback in Vercel
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Database Rollback
```bash
# List migration history
npx prisma migrate status

# Create down migration if needed
npx prisma migrate diff
```

## Scaling Considerations

### Vercel Limits (Free Tier)
- 100GB bandwidth/month
- 100 hours compute time
- 12 serverless functions
- 6000 function invocations/day

### Database Scaling
- Neon: 3GB storage free tier
- Connection pooling recommended
- Consider read replicas for high traffic

### Optimization Tips
1. Use ISR for static pages
2. Implement API response caching
3. Optimize images with next/image
4. Use edge functions where possible
5. Monitor Core Web Vitals

## Maintenance

### Regular Tasks
- [ ] Weekly: Check error logs
- [ ] Monthly: Review performance metrics
- [ ] Quarterly: Update dependencies
- [ ] Yearly: Review security settings

### Backup Strategy
```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

---

*For platform-specific deployment guides, see the related documentation in this section.*