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

### `/app/api/expenses/route.ts`
- Handles expense CRUD operations
- Supports filtering by `contractId`, `status`, `category`, `type`
- Supports sorting by `dueDate`, `amount`, `status`, `category`, `vendor`, `createdAt`
- Returns expenses with included contract info

### `/app/api/budgets/route.ts`
- Handles budget CRUD operations
- Supports filtering by `category`, `status`
- Calculates actual spend vs budgeted amounts
- Returns budgets with expense aggregations

### `/app/api/ai/create-expense/route.ts`
- AI-powered expense creation endpoint
- Processes natural language input in Portuguese
- Extracts expense information using GPT-4o-mini
- Supports Portuguese date/amount parsing ("hoje", "5k", etc.)

### `/app/api/export/excel/route.ts`
- Generates Excel files using ExcelJS
- Creates 4 worksheets: Contracts, Receivables, Expenses, Monthly Cashflow
- Includes net cashflow calculations (income - expenses)
- Applies currency formatting and styling
- Uses date-fns for date formatting

### `/app/api/export/google-sheets/route.ts`
- Creates Google Sheets via OAuth2 authentication
- Uses Google Sheets API v4 and Drive API v3
- Same data structure as Excel export
- Returns shareable Google Sheets URL

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
// One-to-many: Contract → Receivables & Expenses
model Contract {
  id          String       @id @default(cuid())
  receivables Receivable[] // One contract has many receivables
  expenses    Expense[]    // One contract has many expenses
}

model Receivable {
  contractId String
  contract   Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  // When contract is deleted, all receivables are deleted too
}

model Expense {
  contractId String?
  contract   Contract? @relation(fields: [contractId], references: [id], onDelete: SetNull)
  // Expenses can exist without a contract (general operational expenses)
  // When contract is deleted, expenses are kept but contractId is set to null
}

model Budget {
  id       String @id @default(cuid())
  category String // Links to expense categories
  // Budgets are independent entities for planning
}
```

### Indexes for Performance
```prisma
model Receivable {
  @@index([contractId])    // Fast joins with Contract
  @@index([expectedDate])  // Fast date-based sorting
  @@index([status])        // Fast status filtering
}

model Expense {
  @@index([contractId])    // Fast joins with Contract
  @@index([dueDate])       // Fast date-based sorting
  @@index([status])        // Fast status filtering
  @@index([category])      // Fast category filtering
}

model Budget {
  @@index([category])      // Fast category lookups
  @@index([period])        // Fast period filtering
}
```

## UI Component Standards

### Page Layout Pattern
All pages follow this consistent structure:
```typescript
// Header with navigation
<h1 className="text-3xl font-bold mb-6">[Page Title]</h1>
<Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
  ← Voltar ao início
</Link>

// AI/Manual toggle (where applicable)
<div className="mb-6">
  <button
    onClick={() => setShowAISection(!showAISection)}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
  >
    {showAISection ? 'Adicionar Manual' : 'Adicionar com IA'}
  </button>
</div>

// Form section with conditional rendering
{showAISection ? (
  // AI interface
) : (
  // Manual form with asterisks for required fields
)}

// Filters section
// Data table with actions
```

### Form Field Standards
```typescript
// Required fields must have asterisk
<label className="block text-sm font-medium text-gray-700 mb-1">
  Description *
</label>
<input
  type="text"
  required
  className="w-full p-2 border rounded"
/>

// Optional fields without asterisk
<label className="block text-sm font-medium text-gray-700 mb-1">
  Notes
</label>
<textarea className="w-full p-2 border rounded" />
```

### Button Standards
```typescript
// Primary actions
className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"

// Secondary actions
className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"

// Danger actions
className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
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
3. Run `npx prisma generate` to regenerate Prisma Client
4. Update Zod schemas in API routes
5. Update UI forms and display components
6. Update Excel/Google Sheets export if needed
7. Update AI schema description in `lib/langchain.ts`
8. Update AI prompts if the field affects expense creation

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
3. Add expenses with different types (operational, project, administrative)
4. Create budgets for different categories and periods
5. Test all filter combinations on all pages
6. Test sorting by each field in both directions
7. Test edit/delete operations across all entities
8. Test Excel export with complete data
9. Test Google Sheets export (requires OAuth setup)
10. Test AI expense creation with Portuguese input
11. Test AI queries with various question types
12. Test mandatory field validation with asterisk indicators
13. Test navigation links ("Voltar ao início")
14. Test AI/Manual toggle on expenses page
15. Test error cases (invalid data, network issues)

### API Testing with curl
```bash
# Create contract
curl -X POST http://localhost:3001/api/contracts \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test Client","projectName":"Test Project","totalValue":5000,"signedDate":"2024-01-01"}'

# Create expense
curl -X POST http://localhost:3001/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"description":"Office supplies","amount":150,"dueDate":"2024-01-15","category":"office","type":"operational"}'

# List with filters
curl "http://localhost:3001/api/contracts?status=active&sortBy=totalValue&sortOrder=desc"
curl "http://localhost:3001/api/expenses?status=pending&category=materials&sortBy=dueDate"

# Test AI query
curl -X POST http://localhost:3001/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"question":"How many active contracts do I have?"}'

# Test AI expense creation
curl -X POST http://localhost:3001/api/ai/create-expense \
  -H "Content-Type: application/json" \
  -d '{"message":"Comprei material de construção por 2.5k para vencer em 15 dias"}'
```

## Deployment Notes

### Environment Variables
```bash
# Development
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"

# Production (Vercel + Railway)
DATABASE_URL="postgresql://user:pass@host:port/db"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-production-google-oauth-client-id"
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