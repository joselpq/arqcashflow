# ArqCashflow - Architect Cashflow Management System

A simple cashflow management system designed for architects to track contracts, receivables, and analyze financial data using AI.

## Features

1. **Contract Management** - Create, edit, delete, and manage client contracts with categories
2. **AI Contract Creation** - Create contracts using natural language (Portuguese) with intelligent parsing
3. **Receivables Tracking** - Track expected and received payments with categories and filtering
4. **Advanced Filtering & Sorting** - Filter and sort both contracts and receivables by multiple criteria
5. **Excel Export** - Generate comprehensive cashflow reports with 3 detailed sheets
6. **AI-Powered Analytics** - Ask natural language questions about your financial data using OpenAI
7. **SQLite Database** - Simple, file-based database (easily upgradeable to PostgreSQL)
8. **Edit/Delete Functionality** - Full CRUD operations on both contracts and receivables
9. **Category System** - Organize contracts and receivables by custom categories
10. **Duplicate Detection** - Smart handling of duplicate client/project names with auto-increment

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your-openai-api-key-here"
```

### 3. Initialize Database

```bash
npx prisma migrate dev
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

**Note**: If port 3000 is occupied, the app will run on the next available port (3001, 3002, etc.)

## API Documentation

### Contracts

- **GET /api/contracts** - List all contracts with receivables
  - **Query params**: `?status=active&category=construction&sortBy=totalValue&sortOrder=desc`
  - **Filters**: `status` (active/completed/cancelled), `category` (any custom category)
  - **Sorting**: `sortBy` (createdAt/signedDate/clientName/projectName/totalValue/status), `sortOrder` (asc/desc)
- **POST /api/contracts** - Create new contract
  ```json
  {
    "clientName": "string",
    "projectName": "string",
    "description": "string (optional)",
    "totalValue": number,
    "signedDate": "YYYY-MM-DD",
    "category": "string (optional)",
    "notes": "string (optional)"
  }
  ```
- **GET /api/contracts/[id]** - Get specific contract with receivables
- **PUT /api/contracts/[id]** - Update contract (all fields optional)
- **DELETE /api/contracts/[id]** - Delete contract (cascades to receivables)

### Receivables

- **GET /api/receivables** - List all receivables with contract details
  - **Query params**: `?contractId=xxx&status=pending&category=construction&sortBy=expectedDate&sortOrder=asc`
  - **Filters**: `contractId` (specific contract), `status` (pending/received/overdue/cancelled), `category` (any custom category)
  - **Sorting**: `sortBy` (expectedDate/amount/status/category/receivedDate/createdAt), `sortOrder` (asc/desc)
- **POST /api/receivables** - Create new receivable
  ```json
  {
    "contractId": "string",
    "expectedDate": "YYYY-MM-DD",
    "amount": number,
    "invoiceNumber": "string (optional)",
    "category": "string (optional)",
    "notes": "string (optional)"
  }
  ```
- **PUT /api/receivables/[id]** - Update receivable (all fields optional)
  ```json
  {
    "status": "received",
    "receivedDate": "YYYY-MM-DD",
    "receivedAmount": number,
    "category": "string (optional)"
  }
  ```
- **DELETE /api/receivables/[id]** - Delete receivable

### Excel Export

- **GET /api/export/excel** - Download Excel report with 3 sheets:
  1. **Contracts Overview** - Summary of all contracts with totals and receivable counts
  2. **Receivables Detail** - All receivables with categories, statuses, and contract info
  3. **Monthly Cashflow** - Month-by-month breakdown of expected vs received payments

### AI Queries

- **POST /api/ai/query** - Ask questions in natural language
  ```json
  {
    "question": "What was my average monthly income?"
  }
  ```

### AI Contract Creation

- **POST /api/ai/create-contract** - Create contracts using natural language
  ```json
  {
    "message": "Projeto João e Maria, residencial, 70m2, R$17k, 1/5/2024",
    "history": [],
    "pendingContract": null,
    "isConfirming": false
  }
  ```
  - Supports Portuguese date formats: "01/Abril", "1 de maio", "15/03"
  - Intelligent parsing of values: "17k" → 17000, "2.5 mil" → 2500
  - Handles missing information by asking follow-up questions
  - Detects duplicate contracts and offers to create new or edit existing

## UI Pages

1. **/** - Home page with navigation and API endpoints overview
2. **/contracts** - Full contract management with advanced filtering
   - **AI Assistant**: Create contracts using natural language (e.g., "Projeto João, residencial, 32k, 1/abril")
   - **Smart Duplicate Detection**: Automatically detects existing contracts and offers options
   - **Date Intelligence**: Understands various date formats in Portuguese
   - **Missing Info Handling**: Asks for missing required fields intelligently
   - Manual creation mode with forms
   - Filter by status, category
   - Sort by date, value, client, etc.
3. **/receivables** - Full receivable management with advanced filtering
   - Create, edit, delete receivables with categories
   - Filter by contract, status, category
   - Sort by date, amount, status, etc.
   - Mark payments as received
4. **/ai-chat** - Natural language chat interface for financial analytics

## Database Schema

### Contract
- id (unique identifier)
- clientName
- projectName
- description
- totalValue
- signedDate
- status (active/completed/cancelled)
- category
- notes
- receivables (relation)

### Receivable
- id (unique identifier)
- contractId (foreign key to Contract.id)
- expectedDate (when payment is expected)
- amount (expected payment amount)
- status (pending/received/overdue/cancelled)
- receivedDate (actual date payment was received)
- receivedAmount (actual amount received)
- invoiceNumber (optional invoice reference)
- category (e.g., "project work", "construction visit", "commission")
- notes (optional additional info)
- createdAt, updatedAt (automatic timestamps)

### Category
- id (unique identifier)
- name
- color (for UI visualization)

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel:
   - `DATABASE_URL` - Use Railway PostgreSQL or Vercel Postgres
   - `OPENAI_API_KEY` - Your OpenAI API key

### Railway Database Setup

1. Create PostgreSQL database in Railway
2. Copy connection string
3. Update `DATABASE_URL` in Vercel
4. Update Prisma schema datasource to PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Run migrations: `npx prisma migrate deploy`

## Testing the System

### Quick Test Flow

1. **Create a Contract with AI**
   - Go to /contracts
   - Click "🤖 Adicionar com IA"
   - Type in natural language: "Projeto João e Maria, residencial, 70m2, R$17k, 1/5/2024"
   - AI will parse and ask for confirmation
   - If missing info (like date), AI will ask for it
   - Confirm to create the contract

2. **Handle Duplicate Contracts**
   - Try creating the same contract again
   - AI will detect and ask: "Editar existente ou criar novo?"
   - Choose option 2 to create with auto-incremented name

3. **Add Receivables**
   - Go to /receivables
   - Select the contract you created
   - Add expected payment dates and amounts

4. **Export to Excel**
   - Click "Download Excel Report" on home page
   - Review the generated spreadsheet

5. **Test AI Chat**
   - Go to /ai-chat
   - Ask questions like:
     - "What is my total contract value?"
     - "How many pending receivables do I have?"
     - "Show me all contracts from this month"

## Open Questions & Future Enhancements

1. **Authentication**: Should we add user authentication for multi-user support?
2. **Email Notifications**: Send reminders for upcoming/overdue receivables?
3. **Dashboard Visualizations**: Add charts for visual cashflow analysis?
4. **Invoice Generation**: Auto-generate PDF invoices?
5. **Recurring Receivables**: Support for automatic recurring payment schedules?
6. **Multi-currency Support**: Handle different currencies?
7. **Client Portal**: Allow clients to view their contract status?
8. **Backup System**: Automated database backups?
9. **Mobile App**: Native mobile application?
10. **Integration**: Connect with accounting software (QuickBooks, etc.)?

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY not configured"**
   - Add your OpenAI API key to `.env` file
   - Restart the development server

2. **Database connection errors**
   - Run `npx prisma migrate dev` to ensure database is initialized
   - Check that `DATABASE_URL` is correctly set

3. **Excel download not working**
   - Ensure you have data in the database first
   - Check browser console for errors

## Project Structure

```
arqcashflow/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── contracts/            # Contract CRUD operations
│   │   │   ├── route.ts          # GET, POST with filtering/sorting
│   │   │   └── [id]/route.ts     # GET, PUT, DELETE specific contract
│   │   ├── receivables/          # Receivable CRUD operations
│   │   │   ├── route.ts          # GET, POST with filtering/sorting
│   │   │   └── [id]/route.ts     # GET, PUT, DELETE specific receivable
│   │   ├── export/               # Export functionality
│   │   │   └── excel/route.ts    # Excel generation with ExcelJS
│   │   └── ai/                   # AI-powered features
│   │       ├── query/route.ts    # Natural language to SQL queries
│   │       └── create-contract/route.ts # AI contract creation with NLP
│   ├── contracts/page.tsx        # Contract management UI with filters
│   ├── receivables/page.tsx      # Receivable management UI with filters
│   ├── ai-chat/page.tsx          # AI chat interface
│   └── page.tsx                  # Home page
├── lib/                          # Shared utilities
│   ├── prisma.ts                 # Prisma client singleton
│   ├── langchain.ts              # OpenAI + database query integration
│   └── fuzzyMatch.ts             # Text similarity and fuzzy matching utilities
├── prisma/                       # Database management
│   ├── schema.prisma             # Database schema definition
│   ├── migrations/               # Database migration files
│   └── dev.db                    # SQLite database file
├── .env                          # Environment variables
└── README.md                     # This file
```

## Architecture Overview

### API Layer (`app/api/`)
- **RESTful design** with standard HTTP methods
- **Filtering & sorting** via query parameters on GET endpoints
- **Zod validation** for all input data
- **Error handling** with consistent JSON responses
- **Database queries** optimized with Prisma ORM

### UI Layer (`app/`)
- **Server-side rendering** with Next.js App Router
- **Client components** for interactive features (forms, filters)
- **Real-time filtering** that updates immediately on change
- **Responsive design** with Tailwind CSS
- **CRUD operations** with optimistic UI updates

### Database Layer (`prisma/`)
- **Relational design** with foreign key constraints
- **Indexed fields** for performance (expectedDate, status, contractId)
- **Cascade deletes** (deleting contract removes all receivables)
- **Automatic timestamps** (createdAt, updatedAt)

### AI Integration
- **Natural Language Queries** (`lib/langchain.ts`)
  - SQL generation from plain English/Portuguese questions
  - Database introspection for accurate query generation
  - Error handling for malformed queries and API failures

- **AI Contract Creation** (`app/api/ai/create-contract/`)
  - Natural language parsing in Portuguese
  - Intelligent date parsing: "01/Abril", "1 de maio", "15/03"
  - Value parsing: "17k" → 17000, "2.5 mil" → 2500
  - Missing information detection and follow-up questions
  - Duplicate detection with smart suggestions
  - Auto-increment for duplicate project names
  - Context-aware conversation handling
  - Robust JSON parsing with error recovery

## Tech Stack

- **Next.js 14** - Full-stack React framework with App Router
- **TypeScript** - Type safety across the entire application
- **Prisma** - Type-safe ORM with migration management
- **SQLite** - Local development database (file-based)
- **PostgreSQL** - Production database (Railway/Vercel)
- **Tailwind CSS** - Utility-first CSS framework for styling
- **ExcelJS** - Excel file generation with charts and formatting
- **Langchain + OpenAI** - AI-powered natural language queries
- **Zod** - Runtime type validation and parsing

## For LLM Agents & Developers

### Quick Start Checklist
1. ✅ **Environment Setup**: Add `OPENAI_API_KEY` to `.env`
2. ✅ **Database**: Run `npx prisma migrate dev` (creates SQLite DB)
3. ✅ **Dependencies**: Run `npm install`
4. ✅ **Test**: Run `npm run dev` and visit http://localhost:3000

### Key Implementation Notes
- **Database migrations**: Use `npx prisma migrate dev --name descriptive_name` for schema changes
- **API testing**: Use browser or Postman to test endpoints; all return JSON
- **Filtering logic**: APIs use `where` clauses; UI uses `useEffect` with dependencies on filter state
- **Form handling**: All forms use controlled components with validation via Zod schemas
- **Error handling**: Try/catch blocks with user-friendly alerts; check browser console for details

### Common Development Tasks
- **Add new field**: Update Prisma schema → migrate → update API validation → update UI forms
- **New filter**: Add to API query params → add UI control → connect to state management
- **New AI question type**: Update schema info in `lib/langchain.ts` for better SQL generation
- **Excel modifications**: Edit `app/api/export/excel/route.ts` - uses ExcelJS library
- **Styling changes**: Use Tailwind classes; existing patterns are minimal and functional

### Database Schema Quick Reference
```sql
-- Core tables (simplified)
Contract (id, clientName, projectName, totalValue, signedDate, status, category)
Receivable (id, contractId→Contract.id, expectedDate, amount, status, category)
Category (id, name, color) -- Currently unused in UI, future enhancement
```

### Current Limitations & TODOs
- No authentication (single-user system)
- No real-time updates (manual refresh needed)
- Limited error messaging (generic alerts)
- No data validation beyond type checking
- Excel export could include charts/visualizations
- No email notifications for overdue payments
- No recurring payment schedules

### Testing Strategy
1. **API testing**: Create contract → add receivables → test filters → export Excel → test AI queries
2. **Edge cases**: Empty states, invalid dates, large numbers, special characters in names
3. **Validation**: Try submitting empty forms, invalid data, non-existent IDs
4. **AI testing**: Ask complex questions, test edge cases, verify SQL generation

## License

MIT