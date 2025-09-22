# ArqCashflow Documentation Automation

Comprehensive automation suite for generating, validating, and maintaining ArqCashflow documentation with LLM-agent optimization.

## 🎯 Overview

This automation system implements **Phase 4** of the LLM-Agent-Optimized Documentation Framework, providing:

- **Automated Documentation Generation**: From code to docs automatically
- **Content Validation**: Link checking, freshness monitoring, and format consistency
- **CI/CD Integration**: GitHub Actions workflows for continuous documentation
- **Quality Assurance**: Health scoring and automated issue creation

## 🔧 Scripts

### 1. API Documentation Generator
**File**: `generate-api-docs.js`

```bash
node generate-api-docs.js
```

**Features**:
- Scans `/app/api` directory for route files
- Extracts HTTP methods, authentication, and team isolation patterns
- Generates comprehensive API documentation with LLM-agent contexts
- Creates 24 API endpoint documentations automatically

**Output**: `../docs/reference/api/*.md`

### 2. Database Schema Generator
**File**: `generate-schema-docs.js`

```bash
node generate-schema-docs.js
```

**Features**:
- Parses `prisma/schema.prisma`
- Documents models, relationships, and business rules
- Generates ER diagrams and performance considerations
- Includes LLM-agent context for database operations

**Output**: `../docs/developer/architecture/database.md`

### 3. Documentation Validator
**File**: `validate-docs.js`

```bash
node validate-docs.js
```

**Features**:
- Validates internal links and references
- Checks content freshness (90-day staleness detection)
- Ensures consistent LLM-agent-optimized format
- Generates health score and detailed reports
- Identifies orphaned files

**Output**: `../validation-report.md`

### 4. Changelog Generator
**File**: `generate-changelog.js`

```bash
node generate-changelog.js [--since=YYYY-MM-DD] [--output=path]
```

**Features**:
- Conventional commit parsing and categorization
- Semantic version generation
- Breaking change detection
- Contributor statistics
- LLM-agent-optimized changelog format

**Output**: `../CHANGELOG.md`

## 📦 NPM Scripts

Install the automation dependencies:

```bash
cd scripts
npm install
```

### Available Commands

```bash
# Generate all documentation
npm run docs:generate

# Generate API docs only
npm run docs:api

# Generate schema docs only
npm run docs:schema

# Validate documentation
npm run docs:validate

# Full build and validation
npm run docs:check

# Clean and regenerate
npm run docs:fresh

# CI/CD pipeline
npm run docs:ci

# Watch for changes and auto-regenerate
npm run docs:watch
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow
**File**: `.github/workflows/docs-automation.yml`

**Triggers**:
- Push to main/develop branches
- Pull requests with documentation changes
- Weekly scheduled health checks

**Jobs**:

#### 1. Generate Documentation
- Auto-generates API and schema docs on code changes
- Validates all documentation
- Comments on PRs with validation results
- Auto-commits generated documentation

#### 2. Weekly Health Check
- Runs comprehensive validation
- Creates GitHub issues for critical problems (health score < 80%)
- Uploads detailed reports as artifacts

#### 3. Test Code Examples
- Extracts TypeScript examples from markdown
- Type-checks documentation code samples
- Ensures examples stay current with codebase

#### 4. Deploy Documentation
- Builds and deploys to GitHub Pages
- Available at: `https://[username].github.io/[repo]/`
- Supports custom domains

## 📊 Validation Results

**Current Health Score**: 69% 🔴

### Issues Found
- **Broken links**: 24
- **Missing metadata**: 8
- **Format inconsistencies**: 12
- **Orphaned files**: 20

### Recommendations
1. **High Priority**: Fix broken links and missing metadata
2. **Medium Priority**: Update format inconsistencies and link orphaned files
3. **Weekly**: Monitor validation reports
4. **Monthly**: Review stale content warnings

## 🔄 Workflow Integration

### Development Workflow
1. **Code Changes** → Automatic API/schema doc generation
2. **PR Creation** → Validation report in comments
3. **Merge to Main** → Auto-commit updated docs + deploy
4. **Weekly Schedule** → Health check + issue creation if needed

### Manual Operations
```bash
# Daily: Generate fresh documentation
npm run docs:fresh

# Before PR: Validate changes
npm run docs:validate

# Release prep: Generate changelog
node generate-changelog.js --since=2024-01-01
```

## 🎯 LLM-Agent Optimization

Every generated document includes:

### Required Frontmatter
```yaml
---
title: "Document Title"
type: "reference|guide|context"
audience: ["developer", "agent", "user"]
contexts: ["api", "database", "integration"]
complexity: "beginner|intermediate|advanced"
last_updated: "YYYY-MM-DD"
version: "X.Y"
agent_roles: ["specific-agent-types"]
related: ["linked-documents"]
dependencies: ["required-tools"]
---
```

### LLM Context Sections
```markdown
## Context for LLM Agents

**Scope**: What this document covers
**Prerequisites**: Required knowledge
**Key Patterns**: Important patterns to understand
```

### Cross-References
- Related documentation linking
- Dependency tracking
- Pattern consistency

## 🔧 Maintenance

### Adding New Generators

1. Create script in `/scripts` directory
2. Follow existing patterns:
   - CLI argument parsing
   - Error handling
   - Progress logging
   - LLM-optimized output
3. Add to `package.json` scripts
4. Update GitHub Actions workflow
5. Add tests for critical paths

### Customizing Validation Rules

Edit `validate-docs.js`:
- Modify `MAX_AGE_DAYS` for staleness detection
- Add new validation rules
- Customize health score calculation
- Add domain-specific checks

### Extending CI/CD

Modify `.github/workflows/docs-automation.yml`:
- Add new jobs for custom validations
- Integrate with other tools (Slack, email)
- Add deployment targets
- Customize notification logic

## 🚨 Troubleshooting

### Common Issues

#### "API directory not found"
```bash
# Verify path in generate-api-docs.js
const API_DIR = path.join(__dirname, '../../../app/api');
```

#### "Schema file not found"
```bash
# Check Prisma schema location
const SCHEMA_FILE = path.join(__dirname, '../../../prisma/schema.prisma');
```

#### "High validation failure rate"
- Run: `npm run docs:validate`
- Check: `validation-report.md`
- Fix: Broken links and missing metadata first

#### "GitHub Actions failing"
- Check: Repository permissions for GitHub Pages
- Verify: Branch protection rules
- Update: Secrets and environment variables

### Debug Mode

Add to any script:
```javascript
const DEBUG = process.env.DEBUG === 'true';
if (DEBUG) console.log('Debug info:', data);
```

Run with:
```bash
DEBUG=true node generate-api-docs.js
```

## 📈 Metrics & Monitoring

### Health Score Calculation
```javascript
const totalIssues = brokenLinks + missingMetadata + formatIssues;
const maxPossibleIssues = totalFiles * 3;
const score = ((maxPossibleIssues - totalIssues) / maxPossibleIssues) * 100;
```

### Success Metrics
- **Health Score**: Target 85%+
- **Broken Links**: Target 0
- **Missing Metadata**: Target 0
- **Stale Content**: < 10% of files
- **Build Success Rate**: 95%+

## 🎉 Benefits Achieved

### For Developers
- ✅ **Zero manual API documentation** - Always current with code
- ✅ **Automatic validation** - Catch issues before deployment
- ✅ **Consistent format** - LLM-optimized structure everywhere
- ✅ **CI/CD integration** - Part of development workflow

### For LLM Agents
- ✅ **Rich context** - Every document has agent-specific information
- ✅ **Structured metadata** - Consistent YAML frontmatter
- ✅ **Cross-references** - Related documents and dependencies
- ✅ **Current information** - Auto-generated from latest code

### For Users
- ✅ **Always up-to-date** - Documentation matches current system
- ✅ **High quality** - Validated links and fresh content
- ✅ **Comprehensive** - API, schema, and guide documentation
- ✅ **Accessible** - Multiple formats and deployment options

---

*This automation system represents the completion of Phase 4, providing a fully automated, LLM-optimized documentation pipeline for ArqCashflow.*