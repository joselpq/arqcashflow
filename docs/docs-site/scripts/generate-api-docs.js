#!/usr/bin/env node

/**
 * Automated API Documentation Generator
 *
 * Scans the /app/api directory and generates comprehensive API documentation
 * following the established LLM-agent-optimized format.
 *
 * Usage: node scripts/generate-api-docs.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_DIR = path.join(__dirname, '../../../app/api');
const OUTPUT_DIR = path.join(__dirname, '../docs/reference/api');
const today = new Date().toISOString().split('T')[0];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract route information from API route files
 */
function analyzeRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const route = {
    methods: [],
    description: '',
    parameters: [],
    responses: [],
    authentication: false,
    teamIsolation: false
  };

  // Extract HTTP methods
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    route.methods.push(match[1]);
  }

  // Check for authentication middleware
  if (content.includes('getServerSession') || content.includes('auth')) {
    route.authentication = true;
  }

  // Check for team isolation
  if (content.includes('teamId')) {
    route.teamIsolation = true;
  }

  // Extract Zod schemas for validation
  const zodSchemas = [];
  const zodRegex = /const\s+(\w+Schema)\s*=\s*z\.object\(\{([^}]+)\}\)/g;
  while ((match = zodRegex.exec(content)) !== null) {
    zodSchemas.push({
      name: match[1],
      definition: match[2]
    });
  }
  route.schemas = zodSchemas;

  // Extract query parameters from findMany calls
  const queryParams = [];
  if (content.includes('sortBy') || content.includes('sortOrder')) {
    queryParams.push('sortBy', 'sortOrder');
  }
  if (content.includes('status') && content.includes('filter')) {
    queryParams.push('status');
  }
  if (content.includes('category') && content.includes('filter')) {
    queryParams.push('category');
  }
  route.queryParams = queryParams;

  return route;
}

/**
 * Generate API route documentation
 */
function generateRouteDoc(routePath, routeInfo) {
  const routeName = path.basename(routePath, '.ts');
  const isCollection = routeName === 'route';
  const resourceName = isCollection ?
    path.basename(path.dirname(routePath)).replace(/\[(\w+)\]/g, '$1') :
    routeName.replace(/\[(\w+)\]/g, '$1');

  const methods = routeInfo.methods.join(', ');
  const endpoint = routePath
    .replace(API_DIR, '/api')
    .replace('/route.ts', '')
    .replace(/\[(\w+)\]/g, '\\{$1\\}'); // Escape curly braces for MDX

  return `---
title: "${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} API"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "${resourceName}", "rest", "database"]
complexity: "intermediate"
last_updated: "${today}"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
related:
  - developer/architecture/overview.md
  - agents/contexts/contract-management.md
dependencies: ["next.js", "prisma", "zod"]
---

# ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} API

Comprehensive API reference for ${resourceName} management operations.

## Context for LLM Agents

**Scope**: Complete ${resourceName} API operations including CRUD, filtering, sorting, and business logic
**Prerequisites**: Understanding of REST APIs, Next.js App Router, Prisma ORM, and team-based data isolation
**Key Patterns**:
- RESTful endpoint design with standard HTTP methods
- Team-based data isolation for multi-tenant security
- Zod validation for type-safe request/response handling
- Consistent error handling and response formats
${routeInfo.authentication ? '- Session-based authentication required for all operations' : ''}

## Endpoint Overview

**Base URL**: \`${endpoint}\`
**Methods**: ${methods}
**Authentication**: ${routeInfo.authentication ? 'Required' : 'None'}
**Team Isolation**: ${routeInfo.teamIsolation ? 'Yes' : 'No'}

${routeInfo.methods.includes('GET') ? `
## GET ${endpoint}

Retrieve ${resourceName} records with optional filtering and sorting.

### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
${routeInfo.queryParams.map(param => {
  switch(param) {
    case 'sortBy':
      return `| \`sortBy\` | string | Sort field | \`createdAt\` |`;
    case 'sortOrder':
      return `| \`sortOrder\` | string | Sort direction (\`asc\`/\`desc\`) | \`desc\` |`;
    case 'status':
      return `| \`status\` | string | Filter by status | \`all\` |`;
    case 'category':
      return `| \`category\` | string | Filter by category | \`all\` |`;
    default:
      return `| \`${param}\` | string | Filter parameter | - |`;
  }
}).join('\n')}

### Example Request

\`\`\`bash
curl -X GET "http://localhost:3000${endpoint}?status=active&sortBy=createdAt&sortOrder=desc" \\
  -H "Content-Type: application/json"
\`\`\`

### Response Format

\`\`\`typescript
interface ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}Response {
  data: ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}[];
  total: number;
  filters: {
    status: string;
    category?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}
\`\`\`
` : ''}

${routeInfo.methods.includes('POST') ? `
## POST ${endpoint}

Create a new ${resourceName} record.

### Request Body

${routeInfo.schemas.length > 0 ? `
Schema validation using Zod:

\`\`\`typescript
${routeInfo.schemas.map(schema => `const ${schema.name} = z.object({${schema.definition}});`).join('\n')}
\`\`\`
` : ''}

### Example Request

\`\`\`bash
curl -X POST "http://localhost:3000${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "example": "Request body will be populated based on the specific ${resourceName} schema"
  }'
\`\`\`

### Response

\`\`\`typescript
interface CreateResponse {
  data: ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)};
  alerts?: AIAlert[];
}
\`\`\`
` : ''}

${routeInfo.methods.includes('PUT') ? `
## PUT ${endpoint.replace(resourceName, '{id}')}

Update an existing ${resourceName} record.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| \`id\` | string | ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} ID |

### Request Body

All fields are optional for updates.

### Example Request

\`\`\`bash
curl -X PUT "http://localhost:3000${endpoint}/clx123456789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "completed"
  }'
\`\`\`
` : ''}

${routeInfo.methods.includes('DELETE') ? `
## DELETE ${endpoint.replace(resourceName, '{id}')}

Delete a ${resourceName} record.

⚠️ **Warning**: This operation may cascade to related records. Use with caution.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| \`id\` | string | ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} ID |

### Example Request

\`\`\`bash
curl -X DELETE "http://localhost:3000${endpoint}/clx123456789"
\`\`\`
` : ''}

## Error Handling

### Standard Error Responses

\`\`\`typescript
interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}
\`\`\`

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Access denied |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL_ERROR | Server error |

${routeInfo.teamIsolation ? `
## Team Isolation

All ${resourceName} operations are automatically filtered by team context:

\`\`\`typescript
// All queries include team isolation
const where = {
  teamId: session.user.teamId,
  ...additionalFilters
};
\`\`\`

This ensures complete data separation between teams in the multi-tenant system.
` : ''}

## Implementation Notes

### Business Logic
- **Team Isolation**: ${routeInfo.teamIsolation ? 'Enforced at API level' : 'Not applicable'}
- **Authentication**: ${routeInfo.authentication ? 'Required for all operations' : 'Public access'}
- **Validation**: Zod schemas ensure type safety
- **Error Handling**: Consistent error responses across all endpoints

### Performance Considerations
- **Pagination**: Consider implementing for large result sets
- **Indexing**: Ensure database indexes for filtered fields
- **Caching**: Consider response caching for frequently accessed data

### Related Documentation
- [Architecture Overview](../../developer/architecture/overview.md)
- [Database Schema](../../developer/architecture/database.md)
- [Authentication Guide](../../developer/authentication.md)

---

*This documentation is auto-generated from the codebase. For updates, modify the source API routes and regenerate.*`;
}

/**
 * Scan API directory and generate documentation
 */
function scanAPIDirectory(dir) {
  const routes = [];

  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        scanDir(itemPath);
      } else if (item === 'route.ts' || item === 'route.js') {
        routes.push(itemPath);
      }
    }
  }

  scanDir(dir);
  return routes;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning API routes...');

  if (!fs.existsSync(API_DIR)) {
    console.error(`❌ API directory not found: ${API_DIR}`);
    process.exit(1);
  }

  const routes = scanAPIDirectory(API_DIR);
  console.log(`📁 Found ${routes.length} API routes`);

  for (const routePath of routes) {
    console.log(`📝 Processing: ${routePath}`);

    try {
      const routeInfo = analyzeRouteFile(routePath);
      const documentation = generateRouteDoc(routePath, routeInfo);

      // Generate output filename (replace [id] patterns to avoid MDX issues)
      const relativePath = path.relative(API_DIR, routePath);
      const resourceName = path.dirname(relativePath)
        .replace(/\//g, '-')
        .replace(/\[(\w+)\]/g, '{$1}'); // Replace [id] with {id} for filenames
      const outputFile = path.join(OUTPUT_DIR, `${resourceName}.md`);

      // Write documentation
      fs.writeFileSync(outputFile, documentation);
      console.log(`✅ Generated: ${outputFile}`);

    } catch (error) {
      console.error(`❌ Error processing ${routePath}:`, error.message);
    }
  }

  // Generate index file
  const indexContent = generateIndexFile(routes);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.md'), indexContent);

  console.log('🎉 API documentation generation complete!');
}

/**
 * Generate API index file
 */
function generateIndexFile(routes) {
  const resources = routes.map(route => {
    const relativePath = path.relative(API_DIR, route);
    const resourceName = path.dirname(relativePath)
      .replace(/\//g, '-')
      .replace(/\[(\w+)\]/g, '{$1}'); // Replace [id] with {id} for filenames
    return {
      name: resourceName,
      path: `./${resourceName}.md`
    };
  });

  return `---
title: "API Reference"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "rest", "documentation"]
complexity: "intermediate"
last_updated: "${today}"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
---

# API Reference

Comprehensive API documentation for ArqCashflow REST endpoints.

## Available APIs

${resources.map(resource => `- [${resource.name.charAt(0).toUpperCase() + resource.name.slice(1)} API](${resource.path})`).join('\n')}

## General Information

### Base URL
\`\`\`
Development: http://localhost:3000/api
Production: https://your-domain.vercel.app/api
\`\`\`

### Authentication
Most endpoints require authentication. Include session cookies or use NextAuth.js authentication.

### Content Type
All requests and responses use \`application/json\` content type.

### Team Isolation
All data operations are automatically filtered by team context for multi-tenant security.

---

*This documentation is auto-generated from the codebase. Last updated: ${today}*`;
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateRouteDoc, analyzeRouteFile };