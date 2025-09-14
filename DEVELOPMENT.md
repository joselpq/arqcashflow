# Development Guide - ArqCashflow

## For LLM Agents and New Developers

This document provides detailed technical information for developers working on the ArqCashflow project.

## Code Patterns & Conventions

### API Routes Pattern
All API routes follow this structure:
```typescript
// app/api/[resource]/route.ts - Collection operations
export async function GET(request: NextRequest) {
  // Parse query params for filtering/sorting
  // Build Prisma where clause
  // Return JSON response
}

export async function POST(request: NextRequest) {
  // Validate with Zod schema
  // Create resource with Prisma
  // Return created resource
}

// app/api/[resource]/[id]/route.ts - Item operations
export async function GET/PUT/DELETE(request, { params }) {
  // Use params.id for specific resource operations
}
```

### UI Component Pattern
All UI pages follow this structure:
```typescript
'use client'
import { useState, useEffect } from 'react'

export default function PageComponent() {
  // State management
  const [data, setData] = useState([])
  const [filters, setFilters] = useState({ ... })
  const [formData, setFormData] = useState({ ... })
  const [editingItem, setEditingItem] = useState(null)

  // Effects
  useEffect(() => { fetchData() }, [filters])

  // CRUD functions
  async function fetchData() { ... }
  async function handleSubmit() { ... }
  async function editItem() { ... }
  async function deleteItem() { ... }

  // Render with filters + form + list
}
```

### Database Query Patterns
```typescript
// Basic filtering
const where: any = {}
if (status && status !== 'all') where.status = status
if (category && category !== 'all') where.category = category

// Sorting
const orderBy: any = {}
if (validSortFields.includes(sortBy)) {
  orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
}

// Query with relations
const results = await prisma.model.findMany({
  where,
  include: { relatedModel: true },
  orderBy,
})
```

## Key Files & Their Purpose

### `/app/api/contracts/route.ts`
- Handles contract CRUD operations
- Supports filtering by `status`, `category`
- Supports sorting by `createdAt`, `signedDate`, `clientName`, `projectName`, `totalValue`, `status`
- Returns contracts with included receivables

### `/app/api/receivables/route.ts`
- Handles receivable CRUD operations
- Supports filtering by `contractId`, `status`, `category`
- Supports sorting by `expectedDate`, `amount`, `status`, `category`, `receivedDate`, `createdAt`
- Returns receivables with included contract info

### `/app/api/export/excel/route.ts`
- Generates Excel files using ExcelJS
- Creates 3 worksheets: Contracts, Receivables, Monthly Cashflow
- Applies currency formatting and styling
- Uses date-fns for date formatting

### `/lib/langchain.ts`
- Integrates OpenAI with database for natural language queries
- Converts English questions to SQL queries
- Uses Prisma's raw query functionality
- Handles BigInt serialization issues

### `/lib/prisma.ts`
- Singleton pattern for Prisma client
- Prevents multiple instances in development
- Standard pattern for Next.js applications

## Database Schema Details

### Relationships
```prisma
// One-to-many: Contract → Receivables
model Contract {
  id          String       @id @default(cuid())
  receivables Receivable[] // One contract has many receivables
}

model Receivable {
  contractId String
  contract   Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  // When contract is deleted, all receivables are deleted too
}
```

### Indexes for Performance
```prisma
model Receivable {
  @@index([contractId])    // Fast joins with Contract
  @@index([expectedDate])  // Fast date-based sorting
  @@index([status])        // Fast status filtering
}
```

## Common Issues & Solutions

### BigInt Serialization
**Problem**: SQLite returns BigInt values that can't be JSON serialized.
**Solution**: Convert to string before serialization:
```typescript
const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
))
```

### Excel Column Formatting
**Problem**: Adding/removing columns breaks currency formatting.
**Solution**: Always check if column exists before formatting:
```typescript
const column = sheet.getColumn('D')
if (column) column.numFmt = '$#,##0.00'
```

### Date Handling
**Problem**: Date formatting inconsistencies between database and UI.
**Solution**: Always use `date-fns` for consistent formatting:
```typescript
import { format } from 'date-fns'
format(new Date(dateString), 'yyyy-MM-dd')
```

### Filter State Management
**Problem**: Filters not triggering re-fetches.
**Solution**: Include filters in useEffect dependency:
```typescript
useEffect(() => { fetchData() }, [filters])
```

## Adding New Features

### Adding a New Database Field
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_new_field`
3. Update Zod schemas in API routes
4. Update UI forms and display components
5. Update Excel export if needed
6. Update AI schema description in `lib/langchain.ts`

### Adding a New Filter
1. Add query param handling in API route
2. Add to Prisma `where` clause construction
3. Add UI control (select/input)
4. Connect to filters state
5. Test with various combinations

### Adding a New API Endpoint
1. Create route file: `app/api/[name]/route.ts`
2. Implement HTTP methods (GET, POST, etc.)
3. Add Zod validation schemas
4. Add error handling
5. Update README API documentation

## Performance Considerations

### Database Queries
- Always use indexes for filtering fields
- Limit the number of included relations
- Use `select` instead of full models when possible
- Consider pagination for large datasets

### UI Updates
- Use React's built-in state management
- Avoid unnecessary re-renders with useCallback/useMemo
- Implement optimistic updates for better UX

### Excel Export
- Stream large datasets instead of loading all in memory
- Use ExcelJS efficiently (don't recreate objects)
- Consider background processing for very large exports

## Testing Approach

### Manual Testing Checklist
1. Create test contracts with various categories
2. Add receivables with different statuses and categories
3. Test all filter combinations
4. Test sorting by each field in both directions
5. Test edit/delete operations
6. Test Excel export with data
7. Test AI queries with various question types
8. Test error cases (invalid data, network issues)

### API Testing with curl
```bash
# Create contract
curl -X POST http://localhost:3000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test Client","projectName":"Test Project","totalValue":5000,"signedDate":"2024-01-01"}'

# List with filters
curl "http://localhost:3000/api/contracts?status=active&sortBy=totalValue&sortOrder=desc"

# Test AI query
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"question":"How many active contracts do I have?"}'
```

## Deployment Notes

### Environment Variables
```bash
# Development
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."

# Production (Vercel + Railway)
DATABASE_URL="postgresql://user:pass@host:port/db"
OPENAI_API_KEY="sk-..."
```

### Database Migration for Production
```bash
# Deploy migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Common Deployment Issues
1. **BigInt serialization**: Already handled in codebase
2. **Date timezone issues**: Use UTC consistently
3. **File uploads**: Not implemented yet (Excel is download-only)
4. **API rate limits**: OpenAI has usage limits
5. **Database connections**: Use connection pooling in production