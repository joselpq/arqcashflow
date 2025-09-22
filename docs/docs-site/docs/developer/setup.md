---
title: "Development Setup"
type: "guide"
audience: ["developer"]
contexts: ["development", "setup", "environment", "database"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "2.0"
agent_roles: ["setup-assistant", "environment-configurator"]
related:
  - developer/architecture/overview.md
  - developer/deployment/production.md
dependencies: ["node.js", "npm", "git", "prisma", "claude-api"]
---

# Development Setup

Complete setup guide for ArqCashflow local development environment with full AI integration and database configuration.

## Context for LLM Agents

**Scope**: Complete development environment setup with database and AI integration
**Prerequisites**: Node.js 18+, Git, basic command line knowledge, Claude API access
**Key Patterns**:
- Environment configuration with secrets management
- Database setup (SQLite dev, PostgreSQL prod)
- AI integration with Claude API
- Prisma ORM workflow
- NextAuth.js authentication setup

## Prerequisites

- **Node.js 18+** and npm
- **Git** for version control
- **Claude API Key** from Anthropic (for AI features)
- **PostgreSQL** (for production) or SQLite (development)
- Basic command line knowledge

## Quick Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd arqcashflow
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database (PostgreSQL - both development and production)
DATABASE_URL="postgresql://username:password@localhost:5432/arqcashflow"
# Or for development with SQLite (legacy option):
# DATABASE_URL="file:./dev.db"

# AI Features (Claude API)
CLAUDE_API_KEY="your-claude-api-key-here"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google Sheets Export (Optional)
GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR-KEY-HERE\n-----END PRIVATE KEY-----"

# Recurring Expenses Cron Job
CRON_SECRET="your-secure-cron-secret-here"
```

### 3. Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32
```

### 4. Database Setup

```bash
# Initialize database
npx prisma migrate dev

# Or for production-like setup
npx prisma db push
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

**Note**: The app runs on port 3000 by default. If occupied, use `PORT=3001 npm run dev`.

## Detailed Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@localhost:5432/db` |
| `CLAUDE_API_KEY` | Claude API key for AI features | `sk-ant-api03-...` |
| `NEXTAUTH_SECRET` | NextAuth.js session secret | Generated with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application base URL | `http://localhost:3000` |

### Optional Variables

| Variable | Description | Purpose |
|----------|-------------|----------|
| `GOOGLE_CLIENT_EMAIL` | Google service account email | Google Sheets export |
| `GOOGLE_PRIVATE_KEY` | Google service account private key | Google Sheets export |
| `CRON_SECRET` | Secret for cron job authentication | Recurring expenses automation |

### Getting Claude API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

## Development Workflow

### Daily Development

```bash
# Start development server
npm run dev

# View database in browser
npx prisma studio

# Reset database (if needed)
npx prisma migrate reset
```

### Database Management

```bash
# Create new migration
npx prisma migrate dev --name descriptive_name

# Push schema changes (development)
npx prisma db push

# Generate Prisma client (after schema changes)
npx prisma generate
```

### Testing and Building

```bash
# Build for production
npm run build

# Test production build locally
npm start

# Run linting
npm run lint
```

## Recurring Expenses Automation

The system includes automated recurring expense generation:

- **Schedule**: Daily at 2 AM UTC via Vercel Cron
- **Endpoint**: `/api/cron/generate-recurring`
- **Authentication**: Requires `CRON_SECRET` environment variable
- **Look-ahead**: Generates expenses up to 3 months in advance

### Manual Testing of Cron Job

```bash
# Test the cron endpoint manually (requires CRON_SECRET)
curl -X GET "http://localhost:3000/api/cron/generate-recurring" \
  -H "Authorization: Bearer your-cron-secret-here"
```

## Troubleshooting

### Common Issues

1. **"CLAUDE_API_KEY not configured"**
   - Add your Claude API key to `.env` file (format: `sk-ant-...`)
   - Restart the development server

2. **Database connection errors**
   - Run `npx prisma migrate dev` to ensure database is initialized
   - Check that `DATABASE_URL` is correctly set

3. **Port already in use**
   - Use `PORT=3001 npm run dev` to specify a different port
   - Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

4. **Excel download not working**
   - Ensure you have data in the database first
   - Check browser console for errors

## Next Steps

- [Architecture Overview](./architecture/overview.md) - Understand the system design
- [Production Deployment](./deployment/production.md) - Deploy to production
- [API Reference](../reference/api/contracts.md) - Explore API endpoints

---

*For LLM agents: This setup enables full development environment with AI integration. All code changes are hot-reloaded.*