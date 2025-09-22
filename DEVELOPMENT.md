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

## Common Development Tasks & Best Practices

### Form Development Guidelines
- **Currency Inputs**: Never use `step="0.01"` attribute - causes floating-point precision errors (400 → 399.97)
- **Date Defaults**: Use `getTodayDateString()` from `lib/date-utils.ts` instead of `new Date().toISOString().split('T')[0]`
- **Date Processing**: Use `createDateForStorage()` for API date handling to ensure timezone-safe storage
- **Date Display**: Use `formatDateFull()` for consistent DD/MM/YYYY display across all components
- **Overdue Status**: Use `getReceivableActualStatus()` and `getExpenseActualStatus()` for consistent overdue calculations
- **Empty String Handling**: Clean empty strings before Prisma operations to prevent validation errors

### API Development Guidelines
- **Validation**: Always validate with Zod schemas before database operations
- **Date Handling**: Use `createDateForStorage()` and check for empty strings before Prisma calls
- **Overdue Logic**: Use centralized overdue functions instead of individual date comparisons
- **Status Filtering**: For calculated statuses like "overdue", use conditional queries + post-filtering instead of direct database filtering
- **Filter Consistency**: Ensure filter logic matches display logic for calculated fields
- **Error Handling**: Provide specific error messages for Prisma validation failures
- **Team Isolation**: All queries must filter by `teamId` for multi-tenant security

### Date Handling Best Practices
- **Display Formatting**: Always use `formatDateFull()` from date-utils for consistent DD/MM/YYYY format
- **Input Formatting**: Use `formatDateForInput()` for YYYY-MM-DD format in form fields
- **Overdue Calculations**: Use `isReceivableOverdue()` and `isExpenseOverdue()` for business logic
- **Status Display**: Use `getReceivableActualStatus()` and `getExpenseActualStatus()` for UI components
- **Export Consistency**: All export functions now use centralized overdue calculations

### Recent Bug Fixes & Lessons Learned
1. **Floating-Point Precision**: HTML `step="0.01"` causes precision loss in number inputs
2. **Timezone Issues**: `new Date().toISOString().split('T')[0]` can produce tomorrow's date
3. **Prisma Validation**: Empty strings `""` cause errors for optional DateTime fields - use `null` or `undefined`
4. **Form Consistency**: Date and currency handling must be identical across all entity forms
5. **Date Formatting Inconsistency**: ContractsTab had its own date formatting - now standardized
6. **Overdue Calculation Duplication**: Multiple locations had different overdue logic - now centralized
7. **Status Filter vs Display Mismatch**: Filtering used database status while display used calculated status - fixed with post-filtering
8. **Overdue Filter Not Working**: Filtering for "overdue" returned empty because overdue is calculated, not stored - resolved with conditional queries
9. **API Response Status Mismatch**: APIs filtered correctly but returned objects with database status, not calculated status - fixed by updating status field in response
10. **Inconsistent Filter Logic**: Receivables API mixed function calls and status field checks in filtering - standardized to use updated status field

### Development Workflow
- **Add new field**: Update Prisma schema → migrate → update API validation → update UI forms
- **New filter**: Add to API query params → add UI control → connect to state management
- **Date fields**: Use date utilities, test timezone edge cases
- **Currency fields**: Remove step attributes, test precision with whole numbers

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

### Projetos Page Structure
The main management interface is organized in a unified tab structure:
```typescript
// /app/projetos/page.tsx - Main page with tab navigation
export default function ProjetosPage() {
  const [activeTab, setActiveTab] = useState<'contratos' | 'recebiveis' | 'despesas'>('contratos')

  // Tab switching with URL parameter support
  // Renders ContractsTab, ReceivablesTab, or ExpensesTab based on activeTab
}

// Individual tab components in /app/projetos/components/
// Each follows the same pattern:
// - Header with title
// - Form section for adding new items
// - Filters section
// - Data table with CRUD actions
```

### Component Layout Pattern
All tab components follow this consistent structure:
```typescript
// Header
<h2 className="text-2xl font-bold mb-6">[Tab Title]</h2>

// Form section with required field indicators
<div className="bg-white p-6 rounded-lg shadow mb-6">
  // Manual form with asterisks for required fields
</div>

// Filters section
<div className="bg-white p-4 rounded-lg shadow mb-6">
  // Filter controls (status, category, sorting)
</div>

// Data table with actions
<div className="bg-white rounded-lg shadow">
  // Table with edit/delete actions
</div>
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


## Deployment Notes

### Environment Variables
```bash
# Development
DATABASE_URL="file:./dev.db"
CLAUDE_API_KEY="sk-ant-..."
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"

# Production (Vercel + Railway)
DATABASE_URL="postgresql://user:pass@host:port/db"
CLAUDE_API_KEY="sk-ant-..."
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
3. **File uploads**: Large files supported via smart upload strategy
4. **API rate limits**: Claude API has usage limits
5. **Database connections**: Use connection pooling in production

## Lessons Learned

### Case Study: The "Precision Bug" Investigation (September 2024)

**Problem**: Financial values were mysteriously changing after user input:
- Input: 200 → Stored: 198
- Input: 600 → Stored: 595 or 597
- Input: 30000 → Stored: 29997
- Input: 1000 → Stored: 997

**Initial Investigation**:
We suspected JavaScript floating-point precision issues and spent considerable time investigating:
- Database storage (PostgreSQL DOUBLE PRECISION)
- API serialization/deserialization
- Prisma ORM conversion
- Object spread timing in form submissions

**Extensive Debugging Setup**:
Added comprehensive logging at multiple levels:
- Form level: parseFloat() conversion tracking
- API level: request body value tracking
- Database level: Prisma operation tracking
- Display level: rendering value tracking

**Multiple Fix Attempts**:
1. **Object preparation pattern**: Separating data object creation from function calls
2. **API endpoint restructuring**: Avoiding direct spread in Prisma calls
3. **Comprehensive value tracking**: Following values through entire pipeline

**Breakthrough Discovery**:
The actual root cause was discovered through user observation - when hovering over number input fields and scrolling, the scroll wheel was incrementing/decrementing the values without the user realizing it.

**Actual Problem**: HTML number inputs respond to scroll wheel events even without visible spinners, causing accidental value changes during normal page scrolling.

**Simple Solution**:
```typescript
// Add to all number inputs
onWheel={(e) => e.currentTarget.blur()}
```

**Key Takeaways**:
1. **User interaction bugs can masquerade as complex technical issues**
2. **Always observe actual user behavior, not just code behavior**
3. **HTML form elements have hidden behaviors that can cause unexpected UX issues**
4. **Scroll wheel behavior on number inputs affects UX even with hidden spinners**
5. **Sometimes the simplest explanation (accidental user input) is correct**

**Prevention Strategy**:
- Always disable scroll behavior on number inputs in financial applications
- Test with actual users performing real workflows, not just isolated testing
- Consider that "random" data corruption might indicate interaction bugs
- Investigate UI/UX causes before diving deep into data pipeline debugging

This case demonstrates how a complex technical investigation can reveal a simple UX problem, emphasizing the importance of holistic debugging approaches.

## Advanced Technical Implementation

### Large File Upload Architecture

**Problem Solved**: Vercel serverless functions have a 4.5MB body size limit, which prevented uploading large PDFs for Claude API processing.

**Solution**: Smart dual upload strategy that automatically selects the optimal method:

#### Upload Strategy Selection
```typescript
const largeFileThreshold = 3 * 1024 * 1024 // 3MB
const isLargeFile = file.size > largeFileThreshold

if (isLargeFile) {
  // Use multipart/form-data - bypasses JSON body size limits
  // Files sent as native File objects to /api/ai/assistant
} else {
  // Use JSON + base64 - faster for small files
  // Existing efficient workflow maintained
}
```

#### Backend Processing
```typescript
// Automatic content-type detection
if (contentType.includes('multipart/form-data')) {
  // Process FormData, convert File objects to base64 in Node.js
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
} else {
  // Process JSON with pre-encoded base64 data
  const files = await request.json().files
}
```

#### Benefits
- **32MB PDF Support**: Up from ~2.8MB effective limit
- **No External Dependencies**: Uses standard web APIs, no storage tokens
- **Automatic Selection**: Users don't need to know about the strategy
- **Memory Efficient**: Large file base64 conversion happens server-side
- **Backward Compatible**: Existing small file workflow unchanged

### Current Limitations & Development TODOs
- Limited error messaging (generic alerts)
- No data validation beyond type checking
- Excel export could include charts/visualizations
- No email notifications for overdue payments
- No recurring payment schedules

## Comprehensive Testing Strategy

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
10. Test AI queries with various question types
11. Test mandatory field validation with asterisk indicators
12. Test tab navigation within Projetos page
13. Test URL parameter support for deep linking to tabs
14. Test middleware redirects from old URLs
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
```

### Large File Testing
- Upload PDFs <3MB (should use JSON strategy)
- Upload PDFs 3-32MB (should use FormData strategy)
- Verify both strategies process correctly through Claude API
- Test mixed file sizes in single upload

### Form Validation Testing
- **Currency Precision**: Test entering whole numbers (400, 1000) - should preserve exact values
- **Date Defaults**: Verify "Data Esperada" fields default to today's date, not tomorrow
- **Empty Date Handling**: Test saving forms with empty optional date fields
- **Edit Operations**: Test editing receivables' "Data Esperada" fields successfully

### Edge Cases & Validation
- Empty states, invalid dates, large numbers, special characters in names
- Try submitting empty forms, invalid data, non-existent IDs
- AI testing: Ask complex questions, test edge cases, verify SQL generation
- Upload Strategy Verification: Check browser DevTools to confirm correct Content-Type headers
- Cross-Entity Consistency: Verify currency and date handling works identically across Contratos, Recebíveis, and Despesas