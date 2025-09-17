# ArqCashflow - Architect Cashflow Management System

A secure, multi-tenant cashflow management system designed for architects to track contracts, receivables, and analyze financial data using AI with team-based data segregation.

## 🔐 Current Status: Multi-Tenant Architecture with Authentication

**IMPORTANT**: This system now requires authentication and implements team-based data segregation. Each team can only access their own data.

### Authentication & Team System Status:
- ✅ **User Registration/Login**: NextAuth.js with credentials provider
- ✅ **Team Creation**: Auto-creates teams during registration
- ✅ **Route Protection**: Middleware protects all pages except auth routes
- ✅ **API Security**: All APIs require authentication and filter by team
- ⚠️  **Known Issues**: Contract team assignment bug (see Known Bugs section)

## Features

1. **📊 Professional Dashboard** - Clean, architect-focused financial overview with modern design
   - Health indicators with clear visual status
   - Key metrics with color-coded values and trend indicators
   - Enhanced visual cash flow trends for last 6 months
   - High-contrast alerts for overdue items with improved readability
   - Upcoming receivables and expenses with clear typography
   - Quick action buttons with professional styling
   - Export functionality with Brazilian Portuguese labels
2. **Contract Management** - Create, edit, delete, and manage client contracts with categories
3. **AI Contract Creation** - Create contracts using natural language (Portuguese) with intelligent parsing
4. **Receivables Tracking** - Track expected and received payments with categories and filtering
5. **Payment Recording** - Record actual payment dates and amounts for receivables (supports partial payments)
6. **Expense Management** - Complete cost tracking with vendors, categories, and payment status
7. **AI Expense Creation** - Create expenses using natural language (Portuguese)
8. **Budget Management** - Set and monitor spending budgets by category or project
9. **Advanced Filtering & Sorting** - Filter and sort contracts, receivables, and expenses by multiple criteria
10. **Smart Default Filters** - Default views show only active contracts, pending receivables, and unpaid expenses
11. **Excel Export** - Generate comprehensive cashflow reports with 4 detailed sheets (including expenses)
12. **Google Sheets Export** - Create and share reports directly in Google Sheets with OAuth2 authentication
13. **🤖 Enhanced AI Assistant (Claude-Powered)** - Unified intelligent assistant with multiple capabilities:
    - Natural language queries about financial data
    - Smart entity creation (contracts, expenses, receivables) from text
    - Advanced document processing (direct PDF and image analysis using Claude's vision capabilities)
    - **Large file support**: PDFs up to 32MB with smart FormData/JSON upload strategy
    - Context-aware conversations with full history retention
    - Intelligent date parsing ("amanhã", "daqui a uma semana", "em 3 dias", etc.)
    - Auto project naming from client names with duplicate handling
    - Superior file handling with automatic upload method selection
14. **📊 AI Setup Assistant** - Bulk data import with intelligent processing:
    - Excel/CSV file upload and automatic data extraction
    - **Smart status mapping**: Portuguese → English ("Em andamento" → "active", "Finalizado" → "completed")
    - Intelligent category classification for contracts and expenses
    - Bulk creation of contracts, receivables, and expenses in one operation
    - Preserves original Portuguese information in notes while standardizing system values
    - Comprehensive error handling and validation reporting
15. **AI Supervisor System** - Intelligent data quality monitoring with real-time anomaly detection for data entry
16. **Smart Alerts & Notifications** - Automated detection of duplicates, value anomalies, date inconsistencies, and business rule violations
17. **Alert Action Integration** - Click alerts to directly edit the related items with auto-redirect functionality
18. **Net Cashflow Analysis** - Complete financial picture with income vs expenses
19. **SQLite Database** - Simple, file-based database (easily upgradeable to PostgreSQL)
20. **Edit/Delete Functionality** - Full CRUD operations on all entities
21. **Category System** - Organize contracts, receivables, and expenses by custom categories
22. **Duplicate Detection** - Smart handling of duplicate client/project names with auto-increment
23. **User Authentication** - Secure registration/login system with NextAuth.js
24. **Team-based Data Segregation** - Multi-tenant architecture with isolated data per team
25. **Route Protection** - Middleware-based authentication for all protected routes
26. **Session Management** - JWT-based session handling with secure token validation
27. **Professional Landing Page** - Beautiful responsive landing page for unauthenticated users
28. **Responsive Authentication** - Mobile-optimized login and registration forms with enhanced UX

## 🎨 Design System & UI/UX

### Professional Architect-Focused Design
ArqCashflow features a clean, professional design system specifically crafted for architects who value:

- **Minimal Aesthetics**: Clean lines, proper spacing, and functional beauty
- **Typography Hierarchy**: Clear information organization with readable font weights
- **Professional Color Palette**: Neutral base with semantic accent colors
- **High Contrast**: Optimal readability with proper color contrast ratios
- **Consistent Spacing**: Systematic spacing scale for visual rhythm

### Key Design Features:
- **Clean Navigation**: Minimal navigation bar with underline-based active states
- **Professional Cards**: White cards with subtle borders and clean typography
- **Enhanced Charts**: Readable bar charts with proper text sizing and contrast
- **Semantic Colors**: Green for income, red for expenses, amber for warnings
- **Brazilian Portuguese**: All export and interface elements properly localized

### Component Design:
- **Metric Cards**: Color-coded values with trend indicators
- **Alert Sections**: High-contrast notifications with clear action buttons
- **Data Tables**: Clean layouts with proper spacing and readability
- **Form Elements**: Professional styling with focus states
- **Quick Actions**: Minimal button design with hover states

### Responsive Design Excellence:
- **Mobile-First Approach**: Optimized for smartphones with touch-friendly interfaces
- **Flexible Containers**: Adaptive widths from 320px (mobile) to 672px (desktop)
- **Progressive Enhancement**: Content scales beautifully across all screen sizes
- **Touch Targets**: Properly sized buttons and inputs for mobile interaction
- **Typography Scale**: Responsive text sizing with clear hierarchy
- **Landing Page**: Professional introduction with Brazilian Portuguese content
- **Authentication Forms**: Streamlined login/registration with enhanced accessibility

## 🚨 Known Bugs & Issues

### Recent Fixes (September 2025):
- ✅ **UI/UX Professional Redesign**: Complete visual overhaul with architect-focused aesthetics
- ✅ **Contrast & Readability**: Fixed poor contrast issues throughout dashboard
- ✅ **Navigation Enhancement**: Clean, minimal navigation with proper typography
- ✅ **Chart Improvements**: Enhanced chart readability with better text sizes and colors
- ✅ **Export Translation**: Brazilian Portuguese labels for export functionality
- ✅ **AI Contract Creation**: Fixed 'hoje' (today) date parsing for natural language input
- ✅ **Contracts Page Error**: Resolved client-side exception after supervisor removal
- ✅ **AI Assistant Security**: No longer exposes internal IDs to users
- ✅ **Quality Supervisor Fixes**: Resolved OpenAI JSON format errors that were causing 400 responses
- ✅ **Team Data Filtering**: Fixed Quality Supervisor to properly filter by team for data validation
- ✅ **AI Assistant Enhancement**: Complete overhaul with document processing, receivable creation, and context retention
- ✅ **PDF Document Processing**: PDFs now properly handled with filename-based data extraction
- ✅ **Smart Project Naming**: Auto-uses client name as project name when not specified, with duplicate numbering
- ✅ **Context Retention**: AI now remembers previous messages in conversation for better understanding
- ✅ **Receivable Creation**: Full support for creating receivables with smart contract matching
- ✅ **Advanced Date Parsing**: Supports "daqui a uma semana", "em 3 dias", "próxima semana", etc.
- ✅ **Claude AI Integration**: Migrated from OpenAI to Claude for superior document processing and reliability
- ✅ **Native PDF Processing**: Claude can now directly analyze PDF documents without filename-based fallbacks
- ✅ **Enhanced File Support**: Improved support for images and documents with Claude's advanced vision capabilities
- ✅ **AI Setup Assistant with Smart Status Mapping**: Portuguese→English status conversion ("Em andamento" → "active", "Finalizado" → "completed") fixes filtering issues
- ✅ **Large File Upload Support**: Smart FormData/JSON strategy supports PDFs up to 32MB (bypasses Vercel 4MB limit)
- ✅ **Automatic Upload Method Selection**: Files <3MB use JSON/base64, ≥3MB use FormData for optimal performance
- ✅ **Responsive Authentication Forms**: Complete responsive design overhaul for login and registration pages
- ✅ **Landing Page Integration**: Beautiful responsive landing page for unauthenticated users with Brazilian Portuguese content
- ✅ **Enhanced Mobile Experience**: Improved touch targets, form scaling, and typography hierarchy across all devices
- ✅ **Form Accessibility**: Better contrast, spacing, and visual feedback for authentication forms
- ✅ **Professional Auth Design**: Harmonious design with proper breakpoints and element proportions

### Critical Issues (High Priority):
1. **Contract Team Assignment Bug**
   - **Issue**: Contracts may be assigned to wrong team during creation
   - **Symptoms**: New contracts appear under different user's team than the creator
   - **Root Cause**: Suspected JWT session collision or user ID caching issue
   - **Status**: ⚠️ Under investigation - debug logging added
   - **Workaround**: Users should verify contract visibility after creation
   - **Technical Details**: All contracts showing under "jose's Team" regardless of creator

### Security Vulnerabilities Fixed:
- ✅ **Budgets API**: Was completely unprotected, now requires team authentication
- ✅ **Receivables POST**: Added contract ownership validation
- ✅ **Expenses API**: Already had team filtering, enhanced error handling
- ✅ **AI Query API**: Added team-specific data filtering, removed internal ID exposure
- ✅ **Quality Supervisor**: Fixed team isolation in data validation context

### Authentication Issues:
- ⚠️ **Session Validation**: Added email-to-database user matching for session integrity
- ⚠️ **JWT Token Refresh**: Updated NEXTAUTH_SECRET to force token refresh
- ⚠️ **Error Handling**: Enhanced auth error responses across all APIs

### Data Integrity:
- ⚠️ **Legacy Data**: Some historical data may have NULL teamId (filtered out)
- ⚠️ **Team Assignment**: New user registrations properly create teams
- ✅ **Cascade Filtering**: All API endpoints now properly filter by team

### UI/UX Status:
- ✅ **Professional Design**: Clean, architect-focused aesthetics implemented
- ✅ **Typography**: Proper font hierarchy and readability
- ✅ **Contrast**: Fixed all poor contrast issues
- ✅ **Navigation**: Minimal, professional navigation design
- ✅ **Charts**: Enhanced readability and visual clarity
- ✅ **Responsive Forms**: Login and registration fully optimized for all screen sizes
- ✅ **Landing Page**: Professional introduction page with responsive design
- ✅ **Mobile Experience**: Touch-optimized interfaces with proper scaling
- ✅ **Authentication UX**: Streamlined and accessible auth flow
- ⚠️ **Error Messages**: Some 401 errors may not redirect properly to login
- ⚠️ **Loading States**: Pages may show "no data" briefly during authentication
- ⚠️ **Session Expiry**: Users may need to manually refresh after token expiry

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# AI Features (Updated to Claude)
CLAUDE_API_KEY="your-claude-api-key-here"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google Sheets (Optional)
GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR-KEY-HERE\n-----END PRIVATE KEY-----"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
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

**Note**: The app runs on port 3000 by default. If occupied, use `PORT=3001 npm run dev` to specify a different port.

### 5. First Time Setup - Authentication

1. **Create an Account**:
   - Visit http://localhost:3000
   - You will be redirected to `/login`
   - Click "Register" to create a new account
   - A team will be automatically created for you

2. **Team Isolation**:
   - Each user gets their own team during registration
   - Data is completely isolated between teams
   - Users can only see and manage their team's data

3. **Login**:
   - Use your email and password to login
   - Sessions are managed via JWT tokens
   - Protected routes require authentication

## 🔌 Complete API Documentation

### Base URL
- **Production**: `https://arqcashflow.vercel.app/api`
- **Local Development**: `http://localhost:3000/api`

**🔐 Authentication Required**: All API endpoints require authentication via NextAuth.js session cookies. Data is automatically filtered by team membership.

All API endpoints return JSON responses and support CORS for cross-origin requests.

### Authentication Endpoints
- **POST** `/api/auth/register` - User registration with automatic team creation
- **POST** `/api/auth/signin` - User login
- **POST** `/api/auth/signout` - User logout
- **GET** `/api/auth/session` - Get current session info

---

### 📊 Dashboard API

**Purpose**: Provide comprehensive dashboard data for financial overview

#### **GET /api/dashboard** - Dashboard Data
**Purpose**: Retrieve key financial metrics and health indicators for the dashboard

**Authentication**: Required (team-filtered data)

**Response Format:**
```json
{
  "metrics": {
    "thisMonthRevenue": 15000,
    "thisMonthExpenses": 8000,
    "thisMonthProfit": 7000,
    "totalProfit": 45000,
    "pendingReceivables": 25000,
    "pendingExpenses": 12000,
    "activeContracts": 8,
    "totalContracts": 12
  },
  "cashFlowHealth": {
    "status": "good", // "good", "warning", "critical"
    "message": "Fluxo de caixa saudável"
  },
  "alerts": {
    "overdueReceivables": 2,
    "overdueExpenses": 1,
    "overdueItems": [
      {
        "type": "receivable",
        "id": "receivable_id",
        "description": "Receber R$5.000 de João Silva",
        "dueDate": "2024-09-10T00:00:00.000Z",
        "amount": 5000,
        "editUrl": "/receivables?edit=receivable_id"
      }
    ]
  },
  "upcoming": {
    "receivables": [...],
    "expenses": [...]
  },
  "monthlyTrend": [
    {
      "month": "set 2024",
      "revenue": 15000,
      "expenses": 8000,
      "profit": 7000
    }
  ]
}
```

**Dashboard Features:**
- **Health Indicators**: Automatic assessment of financial health (Good/Warning/Critical)
- **Key Metrics**: Monthly revenue, expenses, profit, and outstanding amounts
- **Overdue Alerts**: Direct links to resolve overdue receivables and expenses
- **Upcoming Items**: Next 7 days receivables and expenses to prevent missed deadlines
- **Trend Analysis**: 6-month visual cashflow history
- **Quick Actions**: Direct navigation to common tasks

---

### 📝 Contracts API

**Purpose**: Manage client contracts and project agreements

#### **GET /api/contracts** - List All Contracts
**Purpose**: Retrieve all contracts with optional filtering and sorting

**Query Parameters:**
- `status` (string): Filter by contract status
  - Values: `active`, `completed`, `cancelled`
- `category` (string): Filter by contract category
  - Examples: `Residencial`, `Comercial`, `Restaurante`
- `sortBy` (string): Sort field
  - Values: `createdAt`, `signedDate`, `clientName`, `projectName`, `totalValue`, `status`
- `sortOrder` (string): Sort direction
  - Values: `asc`, `desc`

**Example Request:**
```bash
curl "https://arqcashflow.vercel.app/api/contracts?status=active&sortBy=totalValue&sortOrder=desc"
```

**Response Format:**
```json
[
  {
    "id": "cmflj9fi70001ju04pkdnplsq",
    "clientName": "João Silva",
    "projectName": "Casa Residencial",
    "description": "Projeto arquitetônico completo",
    "totalValue": 15000,
    "signedDate": "2024-09-15T00:00:00.000Z",
    "status": "active",
    "category": "Residencial",
    "notes": null,
    "createdAt": "2025-09-15T19:44:47.435Z",
    "updatedAt": "2025-09-15T19:44:47.435Z",
    "receivables": []
  }
]
```

#### **POST /api/contracts** - Create New Contract
**Purpose**: Create a new client contract

**Request Body:**
```json
{
  "clientName": "string (required)",
  "projectName": "string (required)",
  "description": "string (optional)",
  "totalValue": "number (required)",
  "signedDate": "YYYY-MM-DD (required)",
  "category": "string (optional)",
  "notes": "string (optional)"
}
```

**Example Request:**
```bash
curl -X POST "https://arqcashflow.vercel.app/api/contracts" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Maria Santos",
    "projectName": "Loja Comercial",
    "description": "Design de interiores para loja",
    "totalValue": 25000,
    "signedDate": "2024-09-15",
    "category": "Comercial"
  }'
```

**Response**: `{contract, alerts}` - includes AI supervisor validation results

#### **GET /api/contracts/[id]** - Get Specific Contract
**Purpose**: Retrieve a single contract with all associated receivables

#### **PUT /api/contracts/[id]** - Update Contract
**Purpose**: Update contract fields (all fields optional)

#### **DELETE /api/contracts/[id]** - Delete Contract
**Purpose**: Delete contract (cascades to all associated receivables)

### 💰 Receivables API

**Purpose**: Track expected payments and record actual payments from contracts

#### **GET /api/receivables** - List All Receivables
**Purpose**: Retrieve all receivables with contract details and payment status

**Query Parameters:**
- `contractId` (string): Filter by specific contract ID
- `status` (string): Filter by payment status
  - Values: `pending`, `received`, `overdue`, `cancelled`
- `category` (string): Filter by receivable category
  - Examples: `project work`, `construction visit`, `commission`
- `sortBy` (string): Sort field
  - Values: `expectedDate`, `amount`, `status`, `category`, `receivedDate`, `createdAt`
- `sortOrder` (string): Sort direction
  - Values: `asc`, `desc`

**Example Request:**
```bash
curl "https://arqcashflow.vercel.app/api/receivables?status=pending&sortBy=expectedDate&sortOrder=asc"
```

**Response Format:**
```json
[
  {
    "id": "receivable_id",
    "contractId": "contract_id",
    "expectedDate": "2024-10-15T00:00:00.000Z",
    "amount": 5000,
    "status": "pending",
    "receivedDate": null,
    "receivedAmount": null,
    "invoiceNumber": "INV-001",
    "category": "project work",
    "notes": "First payment",
    "createdAt": "2024-09-15T10:00:00.000Z",
    "updatedAt": "2024-09-15T10:00:00.000Z",
    "contract": {
      "clientName": "João Silva",
      "projectName": "Casa Residencial"
    }
  }
]
```

#### **POST /api/receivables** - Create New Receivable
**Purpose**: Create a new expected payment for a contract

**Request Body:**
```json
{
  "contractId": "string (required)",
  "expectedDate": "YYYY-MM-DD (required)",
  "amount": "number (required)",
  "invoiceNumber": "string (optional)",
  "category": "string (optional)",
  "notes": "string (optional)"
}
```

**Example Request:**
```bash
curl -X POST "https://arqcashflow.vercel.app/api/receivables" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "cmflj9fi70001ju04pkdnplsq",
    "expectedDate": "2024-10-15",
    "amount": 7500,
    "invoiceNumber": "INV-001",
    "category": "project work"
  }'
```

**Response**: `{receivable, alerts}` - includes value/date validation alerts

#### **PUT /api/receivables/[id]** - Update Receivable
**Purpose**: Update receivable details or record payment

**Request Body (Payment Recording):**
```json
{
  "status": "received",
  "receivedDate": "YYYY-MM-DD",
  "receivedAmount": "number",
  "category": "string (optional)"
}
```

**Example Request:**
```bash
curl -X PUT "https://arqcashflow.vercel.app/api/receivables/receivable_id" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "received",
    "receivedDate": "2024-09-20",
    "receivedAmount": 7500
  }'
```

#### **DELETE /api/receivables/[id]** - Delete Receivable
**Purpose**: Remove a receivable from the system

### 💸 Expenses API

**Purpose**: Track business expenses, operational costs, and project-related spending

#### **GET /api/expenses** - List All Expenses
**Purpose**: Retrieve all expenses with summary statistics and filtering

**Query Parameters:**
- `contractId` (string): Filter by specific contract/project
- `status` (string): Filter by payment status
  - Values: `pending`, `paid`, `overdue`, `cancelled`
- `category` (string): Filter by expense category
  - Examples: `materials`, `labor`, `equipment`, `transport`, `office`, `software`
- `type` (string): Filter by expense type
  - Values: `operational`, `project`, `administrative`
- `vendor` (string): Filter by vendor/supplier name
- `sortBy` (string): Sort field
  - Values: `dueDate`, `amount`, `description`, `vendor`, `createdAt`
- `sortOrder` (string): Sort direction
  - Values: `asc`, `desc`

**Example Request:**
```bash
curl "https://arqcashflow.vercel.app/api/expenses?status=pending&type=project&sortBy=dueDate&sortOrder=asc"
```

**Response Format:**
```json
{
  "expenses": [
    {
      "id": "expense_id",
      "contractId": "contract_id",
      "description": "Materiais de construção",
      "amount": 5000,
      "dueDate": "2024-10-20T00:00:00.000Z",
      "category": "materials",
      "status": "pending",
      "paidDate": null,
      "paidAmount": null,
      "vendor": "Leroy Merlin",
      "invoiceNumber": "LM-2024-001",
      "type": "project",
      "isRecurring": false,
      "notes": "Materiais para primeira fase",
      "receiptUrl": null,
      "createdAt": "2024-09-15T10:00:00.000Z",
      "updatedAt": "2024-09-15T10:00:00.000Z",
      "contract": {
        "clientName": "João Silva",
        "projectName": "Casa Residencial"
      }
    }
  ],
  "summary": {
    "total": 15000,
    "paid": 5000,
    "pending": 10000,
    "overdue": 0,
    "count": 3
  }
}
```

#### **POST /api/expenses** - Create New Expense
**Purpose**: Create a new business expense

**Request Body:**
```json
{
  "description": "string (required)",
  "amount": "number (required)",
  "dueDate": "YYYY-MM-DD (required)",
  "category": "string (required)",
  "contractId": "string (optional)",
  "vendor": "string (optional)",
  "invoiceNumber": "string (optional)",
  "type": "operational|project|administrative (required)",
  "notes": "string (optional)"
}
```

**Example Request:**
```bash
curl -X POST "https://arqcashflow.vercel.app/api/expenses" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Software de design AutoCAD",
    "amount": 2400,
    "dueDate": "2024-10-01",
    "category": "software",
    "vendor": "Autodesk",
    "type": "operational",
    "notes": "Licença anual"
  }'
```

**Response**: `{expense, alerts}` - includes anomaly detection and pattern analysis

#### **PUT /api/expenses/[id]** - Update Expense
**Purpose**: Update expense details or record payment

**Request Body (Payment Recording):**
```json
{
  "status": "paid",
  "paidDate": "YYYY-MM-DD",
  "paidAmount": "number",
  "description": "string (optional)",
  "category": "string (optional)"
}
```

#### **DELETE /api/expenses/[id]** - Delete Expense
**Purpose**: Remove an expense from the system

### 📊 Budgets API

**Purpose**: Manage spending budgets and monitor utilization

#### **GET /api/budgets** - List All Budgets
**Purpose**: Retrieve all budgets with utilization metrics

**Query Parameters:**
- `contractId` (string): Filter by specific contract/project
- `category` (string): Filter by budget category
- `period` (string): Filter by budget period
  - Values: `monthly`, `quarterly`, `project`, `annual`
- `isActive` (boolean): Filter by active status

**Response includes**: budget details + utilization (totalExpenses, paidExpenses, utilizationPercent, remaining)

#### **POST /api/budgets** - Create New Budget
**Purpose**: Create a new spending budget

**Request Body:**
```json
{
  "name": "string (required)",
  "category": "string (required)",
  "budgetAmount": "number (required)",
  "period": "monthly|quarterly|project|annual (required)",
  "startDate": "YYYY-MM-DD (required)",
  "endDate": "YYYY-MM-DD (required)",
  "contractId": "string (optional)"
}
```

---

### 📋 Export APIs

#### **GET /api/export/excel** - Excel Report Download
**Purpose**: Download comprehensive Excel report with multiple sheets

**Sheets Generated:**
1. **Contracts Overview** - Summary of all contracts with totals, receivables, and expenses
2. **Receivables Detail** - All receivables with categories, statuses, and contract info
3. **Expenses Detail** - All expenses with vendors, categories, and payment status
4. **Monthly Cashflow** - Month-by-month breakdown with income, expenses, and net cashflow

**Example Request:**
```bash
curl -O "https://arqcashflow.vercel.app/api/export/excel"
```

#### **POST /api/export/google-sheets** - Google Sheets Export
**Purpose**: Create shareable Google Sheets report with OAuth2 authentication

- Requires Google Cloud setup (see GOOGLE_SHEETS_SETUP.md)
- Creates shareable online spreadsheet with same structure as Excel export
- Returns spreadsheet URL for immediate access

---

### 🤖 AI-Powered APIs

#### **POST /api/ai/query** - Natural Language Analytics
**Purpose**: Ask questions about financial data in natural language (Portuguese/English)

**Request Body:**
```json
{
  "question": "string (required)"
}
```

**Example Request:**
```bash
curl -X POST "https://arqcashflow.vercel.app/api/ai/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Qual foi minha receita total este mês?"
  }'
```

**Response**: `{answer, sqlQuery, alerts}` with AI supervisor insights

#### **POST /api/ai/create-contract** - AI Contract Creation
**Purpose**: Create contracts using natural language (Portuguese)

**Request Body:**
```json
{
  "message": "string (required)",
  "history": "array (optional)",
  "pendingContract": "object (optional)",
  "isConfirming": "boolean (optional)"
}
```

**Example Request:**
```bash
curl -X POST "https://arqcashflow.vercel.app/api/ai/create-contract" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Projeto João e Maria, residencial, 70m2, R$17k, 1/5/2024",
    "history": [],
    "isConfirming": false
  }'
```

#### **POST /api/ai/create-expense** - AI Expense Creation
**Purpose**: Create expenses using natural language (Portuguese)

**Request Body:**
```json
{
  "message": "string (required)",
  "history": "array (optional)",
  "pendingExpense": "object (optional)",
  "isConfirming": "boolean (optional)"
}
```

**Example Request:**
```bash
curl -X POST "https://arqcashflow.vercel.app/api/ai/create-expense" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Compra de materiais na Leroy Merlin, 5 mil reais, vencimento amanhã",
    "history": [],
    "isConfirming": false
  }'
```

### 🤖 AI Supervisor System

The AI Supervisor monitors all data inputs in real-time and provides intelligent alerts:

- **POST /api/contracts** - Contract validation with business logic checks
- **POST /api/receivables** - Receivable validation against contract totals and dates
- **POST /api/expenses** - Expense anomaly detection and vendor analysis
- **POST /api/ai/query** - Query context analysis with proactive insights

**Alert Types:**
- **Value Anomalies**: Extra zeros, unrealistic amounts, contract total mismatches
- **Date Issues**: Past dates, wrong years, timeline inconsistencies
- **Duplicates**: Similar entries, client variations, repeated transactions
- **Business Logic**: Contract status violations, missing relationships
- **Data Quality**: Unusual patterns, category mismatches, vendor inconsistencies

**Alert Severity Levels:**
- `critical` - Immediate attention required (major discrepancies)
- `high` - Important issues that should be addressed
- `medium` - Notable patterns worth reviewing
- `low` - Minor suggestions for optimization

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

### AI Expense Creation

- **POST /api/ai/create-expense** - Create expenses using natural language
  ```json
  {
    "message": "Compra de materiais na Leroy Merlin, 5 mil reais, vencimento amanhã",
    "history": [],
    "pendingExpense": null,
    "isConfirming": false
  }
  ```
  - Natural language parsing in Portuguese
  - Intelligent date parsing: "hoje", "amanhã", "vencimento em 10 dias"
  - Value parsing: "5k" or "5 mil" → 5000
  - Links expenses to projects when mentioned
  - Asks for missing required information

## UI Pages

1. **/** - **Smart Dashboard** - Comprehensive financial overview designed for users with basic finance knowledge
   - **🚨 Health Status**: Visual indicators (Green=Good, Yellow=Warning, Red=Critical) with explanatory messages
   - **📊 Key Metrics**: This month's revenue, expenses, profit, plus outstanding amounts
   - **⚠️ Critical Alerts**: Prominently displayed overdue items with direct "Resolve" buttons
   - **📅 Upcoming Deadlines**: Next week's receivables and expenses to prevent missed payments
   - **📈 6-Month Trends**: Simple bar charts showing revenue, expenses, and profit patterns
   - **🚀 Quick Actions**: Direct navigation to create contracts, record payments, add expenses
   - **Mobile Responsive**: Optimized layout for small screens and tablets
2. **/contracts** - Full contract management with advanced filtering
   - **AI Assistant**: Create contracts using natural language (e.g., "Projeto João, residencial, 32k, 1/abril")
   - **Smart Duplicate Detection**: Automatically detects existing contracts and offers options
   - **Date Intelligence**: Understands various date formats in Portuguese
   - **Missing Info Handling**: Asks for missing required fields intelligently
   - **Smart Default Filter**: Shows only active contracts by default
   - Manual creation mode with forms
   - Filter by status, category (can view all if needed)
   - Sort by date, value, client, etc.
3. **/receivables** - Full receivable management with advanced filtering
   - **AI Assistant**: Create receivables using natural language
   - **Payment Recording**: Record actual payment dates and amounts (supports partial payments)
   - **Enhanced Payment Actions**: "Marcar como Recebido" available for all pending/overdue receivables
   - **Smart Default Filter**: Shows only pending receivables by default
   - Create, edit, delete receivables with categories
   - Filter by contract, status, category (can view all if needed)
   - Sort by date, amount, status, etc.
   - Visual payment status indicators
4. **/expenses** - Complete expense management system
   - **AI Assistant**: Create expenses using natural language
   - **Smart Default Filter**: Shows only pending expenses by default
   - Create, edit, delete expenses with full categorization
   - Filter by contract, status, category, type, vendor
   - Sort by due date, amount, description, etc.
5. **/alerts** - Central alert management system
   - **Direct Edit Links**: Click alerts to automatically redirect to edit the specific item
   - **Smart Integration**: Alerts include entity information and direct edit URLs
   - View all AI Supervisor alerts in one place
   - Dismiss individual or all alerts
   - Real-time alert updates
6. **/ai-chat** - Natural language chat interface for financial analytics

## Recent Improvements & User Experience

### Enhanced Payment Management
- **Payment Date Recording**: Added optional "Data de Recebimento" and "Valor Recebido" fields to receivables
- **Partial Payment Support**: Record different amounts than expected for partial payments or discounts
- **Overdue Payment Actions**: "Marcar como Recebido" button now available for both pending and overdue receivables
- **Visual Payment Indicators**: Received payments display in green with date and amount

### Smart Default Filters
- **Focused Views**: Default filters show only relevant items for better workflow
  - Contracts: Shows only "active" contracts by default
  - Receivables: Shows only "pending" receivables by default
  - Expenses: Shows only "pending" expenses by default
- **Flexible Filtering**: Users can easily switch to "all" to view completed/received items when needed

### Alert System Integration
- **Direct Edit Links**: Clicking "Editar" from alerts automatically opens the edit form for that specific item
- **Smart Redirection**: URLs with `?edit=ID` parameter auto-populate forms and scroll to editing section
- **Seamless Workflow**: No more manual searching for items after clicking alert actions

### Form Improvements
- **Controlled Inputs**: Fixed React controlled/uncontrolled input warnings for better stability
- **Proper Validation**: All form fields properly handle null/undefined values from database
- **Enhanced UX**: Better error handling and form state management

## 📊 Complete Data Models & Schemas

### 📝 Contract Model
**Purpose**: Represents client contracts and project agreements

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | String (CUID) | ✅ | Unique identifier | `cmflj9fi70001ju04pkdnplsq` |
| `clientName` | String | ✅ | Client's full name | `"João Silva"`, `"Maria Santos Ltda"` |
| `projectName` | String | ✅ | Project/service name | `"Casa Residencial"`, `"Loja Comercial"` |
| `description` | String | ❌ | Detailed project description | `"Projeto arquitetônico completo"` |
| `totalValue` | Float | ✅ | Total contract value (BRL) | `15000.00`, `50000.50` |
| `signedDate` | DateTime | ✅ | Contract signature date | `"2024-09-15T00:00:00.000Z"` |
| `status` | String | ✅ | Contract status | `"active"`, `"completed"`, `"cancelled"` |
| `category` | String | ❌ | Project category | `"Residencial"`, `"Comercial"`, `"Restaurante"` |
| `notes` | String | ❌ | Additional notes | `"Cliente preferencial"` |
| `createdAt` | DateTime | ✅ | Creation timestamp | `"2024-09-15T10:00:00.000Z"` |
| `updatedAt` | DateTime | ✅ | Last update timestamp | `"2024-09-15T10:00:00.000Z"` |
| `receivables` | Receivable[] | - | Related receivables (relation) | Array of receivable objects |
| `expenses` | Expense[] | - | Related expenses (relation) | Array of expense objects |
| `budgets` | Budget[] | - | Related budgets (relation) | Array of budget objects |

**Status Values:**
- `active`: Contract is ongoing
- `completed`: Contract finished successfully
- `cancelled`: Contract was cancelled

---

### 💰 Receivable Model
**Purpose**: Tracks expected payments and records actual payments

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | String (CUID) | ✅ | Unique identifier | `receivable_123abc` |
| `contractId` | String | ✅ | Foreign key to Contract | `cmflj9fi70001ju04pkdnplsq` |
| `expectedDate` | DateTime | ✅ | When payment is expected | `"2024-10-15T00:00:00.000Z"` |
| `amount` | Float | ✅ | Expected payment amount | `7500.00` |
| `status` | String | ✅ | Payment status | `"pending"`, `"received"`, `"overdue"`, `"cancelled"` |
| `receivedDate` | DateTime | ❌ | Actual payment date | `"2024-10-10T00:00:00.000Z"` |
| `receivedAmount` | Float | ❌ | Actual amount received | `7500.00` (can differ for partial payments) |
| `invoiceNumber` | String | ❌ | Invoice reference | `"INV-2024-001"` |
| `category` | String | ❌ | Payment category | `"project work"`, `"construction visit"`, `"commission"` |
| `notes` | String | ❌ | Additional notes | `"First payment"`, `"50% advance"` |
| `createdAt` | DateTime | ✅ | Creation timestamp | `"2024-09-15T10:00:00.000Z"` |
| `updatedAt` | DateTime | ✅ | Last update timestamp | `"2024-09-15T10:00:00.000Z"` |
| `contract` | Contract | - | Related contract (relation) | Contract object |

**Status Values:**
- `pending`: Payment not yet received
- `received`: Payment completed
- `overdue`: Payment past due date
- `cancelled`: Payment cancelled

**Payment Categories:**
- `project work`: Main project payments
- `construction visit`: Site visit fees
- `commission`: Sales commissions
- `consultation`: Consultation fees

---

### 💸 Expense Model
**Purpose**: Tracks business expenses and operational costs

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | String (CUID) | ✅ | Unique identifier | `expense_456def` |
| `contractId` | String | ❌ | Optional link to project | `cmflj9fi70001ju04pkdnplsq` |
| `description` | String | ✅ | Expense description | `"Materiais de construção"`, `"Software AutoCAD"` |
| `amount` | Float | ✅ | Expense amount | `5000.00` |
| `dueDate` | DateTime | ✅ | Payment due date | `"2024-10-20T00:00:00.000Z"` |
| `category` | String | ✅ | Expense category | `"materials"`, `"software"`, `"transport"` |
| `status` | String | ✅ | Payment status | `"pending"`, `"paid"`, `"overdue"`, `"cancelled"` |
| `paidDate` | DateTime | ❌ | Actual payment date | `"2024-10-18T00:00:00.000Z"` |
| `paidAmount` | Float | ❌ | Actual amount paid | `5000.00` |
| `vendor` | String | ❌ | Vendor/supplier name | `"Leroy Merlin"`, `"Autodesk"` |
| `invoiceNumber` | String | ❌ | Vendor invoice number | `"LM-2024-001"` |
| `type` | String | ✅ | Expense type | `"operational"`, `"project"`, `"administrative"` |
| `isRecurring` | Boolean | ✅ | Is recurring expense | `false` |
| `notes` | String | ❌ | Additional notes | `"Materiais para primeira fase"` |
| `receiptUrl` | String | ❌ | Receipt/invoice file URL | `"https://storage.com/receipt.pdf"` |
| `createdAt` | DateTime | ✅ | Creation timestamp | `"2024-09-15T10:00:00.000Z"` |
| `updatedAt` | DateTime | ✅ | Last update timestamp | `"2024-09-15T10:00:00.000Z"` |
| `contract` | Contract | - | Related contract (relation) | Contract object (if linked) |

**Expense Types:**
- `operational`: General business operations
- `project`: Specific project costs
- `administrative`: Office and admin costs

**Expense Categories:**
- `materials`: Construction/project materials
- `labor`: Worker payments
- `equipment`: Tools and equipment
- `transport`: Travel and transportation
- `office`: Office supplies and rent
- `software`: Software licenses

---

### 📊 Budget Model
**Purpose**: Manages spending budgets and tracks utilization

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | String (CUID) | ✅ | Unique identifier | `budget_789ghi` |
| `contractId` | String | ❌ | Optional project link | `cmflj9fi70001ju04pkdnplsq` |
| `name` | String | ✅ | Budget name | `"Q1 2024 Budget"`, `"Project João Budget"` |
| `category` | String | ✅ | Budget category | `"materials"`, `"software"` |
| `budgetAmount` | Float | ✅ | Allocated amount | `20000.00` |
| `period` | String | ✅ | Budget period | `"monthly"`, `"quarterly"`, `"project"`, `"annual"` |
| `startDate` | DateTime | ✅ | Budget start date | `"2024-01-01T00:00:00.000Z"` |
| `endDate` | DateTime | ✅ | Budget end date | `"2024-03-31T23:59:59.000Z"` |
| `isActive` | Boolean | ✅ | Is budget active | `true` |
| `notes` | String | ❌ | Additional notes | `"Increased for Q2"` |
| `createdAt` | DateTime | ✅ | Creation timestamp | `"2024-09-15T10:00:00.000Z"` |
| `updatedAt` | DateTime | ✅ | Last update timestamp | `"2024-09-15T10:00:00.000Z"` |
| `contract` | Contract | - | Related contract (relation) | Contract object (if linked) |

**Budget Periods:**
- `monthly`: 1-month budget cycle
- `quarterly`: 3-month budget cycle
- `project`: Entire project duration
- `annual`: 12-month budget cycle

---

### 🎨 Category Model
**Purpose**: Organizes items by custom categories

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | String (CUID) | ✅ | Unique identifier | `category_abc123` |
| `name` | String | ✅ | Category name (unique) | `"Residencial"`, `"Comercial"` |
| `color` | String | ❌ | UI visualization color | `"#FF5733"`, `"blue"` |
| `createdAt` | DateTime | ✅ | Creation timestamp | `"2024-09-15T10:00:00.000Z"` |
| `updatedAt` | DateTime | ✅ | Last update timestamp | `"2024-09-15T10:00:00.000Z"` |

---

### 🔄 RecurringExpense Model
**Purpose**: Manages recurring/repeating expenses

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | String (CUID) | ✅ | Unique identifier | `recurring_xyz789` |
| `description` | String | ✅ | Expense description | `"Office rent"`, `"Software subscription"` |
| `amount` | Float | ✅ | Recurring amount | `2500.00` |
| `category` | String | ✅ | Expense category | `"office"`, `"software"` |
| `vendor` | String | ❌ | Vendor name | `"Property Manager"` |
| `frequency` | String | ✅ | Recurrence pattern | `"monthly"`, `"quarterly"`, `"annual"` |
| `interval` | Int | ✅ | Interval multiplier | `1` (every 1 month), `3` (every 3 months) |
| `dayOfMonth` | Int | ❌ | Day of month (1-31) | `15` (15th of each month) |
| `startDate` | DateTime | ✅ | Recurrence start | `"2024-01-01T00:00:00.000Z"` |
| `endDate` | DateTime | ❌ | Recurrence end | `"2024-12-31T23:59:59.000Z"` |
| `isActive` | Boolean | ✅ | Is recurrence active | `true` |
| `lastGenerated` | DateTime | ❌ | Last expense generated | `"2024-09-15T00:00:00.000Z"` |
| `nextDue` | DateTime | ✅ | Next due date | `"2024-10-15T00:00:00.000Z"` |
| `notes` | String | ❌ | Additional notes | `"Yearly payment in advance"` |
| `createdAt` | DateTime | ✅ | Creation timestamp | `"2024-09-15T10:00:00.000Z"` |
| `updatedAt` | DateTime | ✅ | Last update timestamp | `"2024-09-15T10:00:00.000Z"` |

**Frequency Values:**
- `weekly`: Every week
- `monthly`: Every month
- `quarterly`: Every 3 months
- `annual`: Every year

## Deployment

### 🚀 Live Production Application

**Production URL:** https://arqcashflow.vercel.app

The application is deployed using **Vercel** for hosting and **Neon** for PostgreSQL database and is fully operational.

#### **Current Production Status:**
- ✅ **Application**: Deployed and running
- ✅ **Database**: PostgreSQL tables created and connected
- ✅ **API**: All endpoints functional and tested
- ✅ **AI Features**: OpenAI integration active
- ✅ **Export**: Excel/Google Sheets functionality available

### Production Deployment (Vercel + Neon)

#### **Prerequisites:**
- Vercel account
- GitHub repository
- OpenAI API key

#### **Deployment Steps:**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Deploy to Vercel**
   ```bash
   vercel login
   vercel --prod --yes
   ```

3. **Set up Neon Database**
   - In Vercel dashboard → Storage → Create Database → Choose **Neon**
   - Neon automatically creates environment variables with `DATABASE_` prefix
   - Database connection is automatically configured

4. **Configure Environment Variables**
   Required environment variables in Vercel dashboard:
   - `CLAUDE_API_KEY` - Your Claude API key for AI features (replaces OPENAI_API_KEY)
   - `DATABASE_URL` - Automatically set by Neon integration
   - `DATABASE_HOST`, `DATABASE_USERNAME`, etc. - Automatically set by Neon

5. **Create Database Tables**
   After deployment, create the database schema:
   ```bash
   # Pull production environment variables
   vercel env pull .env.production

   # Create tables in production database
   DATABASE_URL="[production-url]" npx prisma db push
   ```

#### **Production URLs:**
- **Application**: https://arqcashflow.vercel.app
- **Database**: Managed by Neon (PostgreSQL)
- **GitHub**: https://github.com/joselpq/arqcashflow

#### **Database Schema Update for Production:**
The Prisma schema automatically works with both SQLite (development) and PostgreSQL (production):
```prisma
datasource db {
  provider = "sqlite"  // Development
  // provider = "postgresql"  // Production (automatically handled)
  url      = env("DATABASE_URL")
}
```

#### **Environment Variables Reference:**
```env
# Production (Vercel + Neon)
CLAUDE_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:password@host/database
DATABASE_HOST=host.neon.tech
DATABASE_USERNAME=username
DATABASE_PASSWORD=password
DATABASE_NAME=database_name

# Development (Local)
DATABASE_URL="file:./dev.db"
CLAUDE_API_KEY=sk-ant-...
```

#### **Post-Deployment Setup:**
After successful deployment:
1. **Run database migration** to create tables in production
2. **Test core functionality** (create contract, add receivable, AI features)
3. **Set up Google Sheets integration** (optional, see Google Sheets documentation)
4. **Monitor application** through Vercel dashboard

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

- **Enhanced AI Assistant** (`app/api/ai/assistant/`)
  - **Smart Upload Strategy**: Automatic method selection based on file size
    - Files <3MB: JSON + base64 encoding (fast, efficient)
    - Files ≥3MB: multipart/form-data (bypasses Vercel 4MB body limit)
  - **Document Processing**: Direct PDF and image analysis up to 32MB
  - **Intent Classification**: Claude Haiku 3.5 for fast categorization
  - **Document Analysis**: Claude Sonnet 3.5 for advanced reasoning
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
- **Claude API** - AI-powered document processing and natural language queries
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

### Current Limitations & TODOs
- Limited error messaging (generic alerts)
- No data validation beyond type checking
- Excel export could include charts/visualizations
- No email notifications for overdue payments
- No recurring payment schedules

### Testing Strategy
1. **API testing**: Create contract → add receivables → test filters → export Excel → test AI queries
2. **Large File Testing**:
   - Upload PDFs <3MB (should use JSON strategy)
   - Upload PDFs 3-32MB (should use FormData strategy)
   - Verify both strategies process correctly through Claude API
   - Test mixed file sizes in single upload
3. **Edge cases**: Empty states, invalid dates, large numbers, special characters in names
4. **Validation**: Try submitting empty forms, invalid data, non-existent IDs
5. **AI testing**: Ask complex questions, test edge cases, verify SQL generation
6. **Upload Strategy Verification**: Check browser DevTools to confirm correct Content-Type headers

## License

MIT