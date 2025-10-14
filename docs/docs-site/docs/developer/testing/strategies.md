---
title: "Testing Strategies"
type: "guide"
audience: ["developer", "agent"]
contexts: ["testing", "quality-assurance", "validation"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["test-implementer", "quality-assurer"]
related:
  - developer/setup.md
  - developer/architecture/overview.md
dependencies: ["jest", "playwright", "curl"]
---

# Testing Strategies

Comprehensive testing approach for ArqCashflow covering manual testing, API validation, form testing, and edge cases.

## Context for LLM Agents

**Scope**: Complete testing methodology including manual workflows, API testing, form validation, and edge case handling
**Prerequisites**: Understanding of REST APIs, form validation, database operations, and AI system testing
**Key Patterns**:
- Manual testing workflows for user journeys
- API testing with curl for all endpoints
- Form validation testing for precision and accuracy
- Large file upload testing for AI integration
- Edge case validation for data integrity

## Testing Philosophy

ArqCashflow uses a multi-layered testing approach:

1. **Authenticated Testing**: Team isolation and middleware validation with test users
2. **Manual Testing**: Complete user journeys and workflows
3. **API Testing**: Direct endpoint validation with curl
4. **Form Validation**: Precision testing for financial data
5. **AI Integration Testing**: Document processing and NLP validation
6. **Edge Case Testing**: Boundary conditions and error states

### Authentication-First Testing

All testing starts with **authenticated test users** to ensure realistic scenarios:
- **Test Users Available**: `test@example.com` and `test2@example.com` (password: `password123`)
- **Team Isolation**: Each user belongs to separate teams for cross-team testing
- **Automated Validation**: Run `npx tsx lib/middleware/validate-with-auth.ts` for complete validation
- **Port Standard**: All testing uses port 3010 (`PORT=3010 npm run dev`)

See **[Authenticated Testing Guide](./authenticated-testing.md)** for complete setup and usage.

## Manual Testing Workflows

### Core User Journey Testing

#### 1. Authentication and Onboarding
```bash
# Test user registration and onboarding flow
1. Visit landing page
2. Create new account via registration form
3. Complete Step 1: Profile setup (Individual vs Company)
4. Complete Step 2: Data import (or skip)
5. Verify redirect to dashboard with team creation
6. Test logout and login cycle
```

#### 2. Contract Management
```bash
# Test complete contract lifecycle
1. Navigate to /contracts
2. Create contract using AI assistant: "Projeto João e Maria, residencial, 70m2, R$17k, 1/5/2024"
3. Verify AI parsing and confirmation flow
4. Test duplicate detection by creating same contract again
5. Edit contract using manual form
6. Test all filter combinations (status, category)
7. Test all sorting options (date, value, client, etc.)
8. Delete contract and verify cascade to receivables
```

#### 3. Financial Operations
```bash
# Test receivables and expenses workflows
1. Create receivables linked to contracts
2. Record payments with different amounts (partial payments)
3. Test standalone receivables (not linked to contracts)
4. Create various expense types (operational, project, administrative)
5. Test recurring expense setup and generation
6. Verify overdue calculations and status updates
7. Test budget creation and utilization tracking
```

#### 4. AI Integration
```bash
# Test AI assistant capabilities
1. Natural language contract creation
2. Natural language expense creation
3. Document upload and processing (PDFs, images)
4. AI chat queries about financial data
5. Setup assistant with bulk data import
6. Test error handling for invalid AI requests
```

#### 5. Export and Reporting
```bash
# Test data export functionality
1. Generate Excel report with multiple sheets
2. Test Google Sheets export (requires OAuth setup)
3. Verify data accuracy in exported files
4. Test export with various data combinations
5. Test large dataset exports
```

### Form Validation Testing

#### Currency Precision Testing
**Critical**: Test for the "precision bug" that was discovered

```bash
# Test exact value preservation
1. Input: 200 → Verify stored: 200 (not 198)
2. Input: 600 → Verify stored: 600 (not 595 or 597)
3. Input: 30000 → Verify stored: 30000 (not 29997)
4. Input: 1000 → Verify stored: 1000 (not 997)

# Test scroll wheel behavior
1. Enter number in input field
2. Hover over input and scroll mouse wheel
3. Verify values don't change accidentally
4. Confirm onWheel blur behavior works
```

#### Date Handling Testing
```bash
# Test date accuracy and timezone handling
1. Verify "Data Esperada" defaults to today's date (not tomorrow)
2. Test various date formats: DD/MM/YYYY, Brazilian formats
3. Test empty optional date fields don't cause errors
4. Test edit operations on existing date fields
5. Verify timezone consistency across creation/editing
```

#### Required Field Validation
```bash
# Test form validation
1. Submit forms with missing required fields
2. Verify asterisk (*) indicators for required fields
3. Test proper error messages for validation failures
4. Test successful submission with all required data
```

## API Testing with curl

### Authentication Testing

**Use Automated Authenticated Testing**: For comprehensive authentication testing, use the dedicated test users:

```bash
# Setup test users and run full validation
npx tsx lib/dev-seed.ts
npx tsx lib/middleware/validate-with-auth.ts
```

**Manual Authentication Testing** (if needed):
```bash
# Test with pre-configured test users
# User 1: test@example.com / password123
# User 2: test2@example.com / password123

# Note: Use port 3010 for all testing
curl -X POST http://localhost:3010/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@example.com&password=password123"
```

### Contract API Testing
```bash
# Create contract
curl -X POST http://localhost:3000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test Client",
    "projectName": "Test Project",
    "totalValue": 5000,
    "signedDate": "2024-01-01",
    "category": "Residencial"
  }'

# List contracts with filters
curl "http://localhost:3000/api/contracts?status=active&sortBy=totalValue&sortOrder=desc"

# Update contract
curl -X PUT http://localhost:3000/api/contracts/[contract-id] \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Delete contract
curl -X DELETE http://localhost:3000/api/contracts/[contract-id]
```

### Receivables API Testing
```bash
# Create receivable
curl -X POST http://localhost:3000/api/receivables \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "contract-id",
    "expectedDate": "2024-10-15",
    "amount": 2500,
    "category": "project work"
  }'

# Record payment
curl -X PUT http://localhost:3000/api/receivables/[receivable-id] \
  -H "Content-Type: application/json" \
  -d '{
    "status": "received",
    "receivedDate": "2024-10-10",
    "receivedAmount": 2500
  }'

# Test filtering
curl "http://localhost:3000/api/receivables?status=pending&sortBy=expectedDate"
```

### Expenses API Testing
```bash
# Create expense
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Office supplies",
    "amount": 150,
    "dueDate": "2024-01-15",
    "category": "office",
    "type": "operational",
    "vendor": "Staples"
  }'

# Test complex filtering
curl "http://localhost:3000/api/expenses?status=pending&category=materials&type=project&sortBy=dueDate"
```

### AI API Testing
```bash
# Test natural language query
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Qual foi minha receita total este mês?"}'

# Test AI contract creation
curl -X POST http://localhost:3000/api/ai/create-contract \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Projeto João e Maria, residencial, 70m2, R$17k, 1/5/2024",
    "history": [],
    "isConfirming": false
  }'

# Test AI expense creation
curl -X POST http://localhost:3000/api/ai/create-expense \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Compra de materiais na Leroy Merlin, 5 mil reais, vencimento amanhã",
    "history": []
  }'
```

## Large File Upload Testing

### AI Document Processing
```bash
# Test file size strategy selection
1. Upload PDFs under 3MB (should use JSON + base64 strategy)
2. Upload PDFs 3-32MB (should use FormData strategy)
3. Verify both strategies process correctly through Claude API
4. Test mixed file sizes in single upload batch
5. Monitor browser DevTools for correct Content-Type headers

# Test document types
1. Upload proposals (should extract contracts + receivables)
2. Upload invoices (should create expenses)
3. Upload receipts (should create expenses with vendor info)
4. Upload images (JPG, PNG) with financial data
5. Test Brazilian format handling (DD/MM/YYYY dates, R$ currency)
```

### Upload Strategy Verification
```bash
# Verify automatic strategy selection
1. Check browser DevTools Network tab
2. Files under 3MB should show Content-Type: application/json
3. Files ≥3MB should show Content-Type: multipart/form-data
4. Both should successfully process through /api/ai/assistant endpoint
```

## Edge Case Testing

### Data Validation
```bash
# Test boundary conditions
1. Empty states (no contracts, receivables, expenses)
2. Invalid dates (future years, impossible dates)
3. Large numbers (test BigInt handling)
4. Special characters in names and descriptions
5. Unicode characters (accented Portuguese)
6. Very long text inputs
7. Negative amounts (should be rejected)
8. Zero amounts (should be allowed)
```

### Error Handling
```bash
# Test error scenarios
1. Submit empty forms
2. Submit invalid data types
3. Test non-existent ID references
4. Test network timeouts
5. Test AI service unavailability
6. Test database connection issues
7. Test unauthorized access attempts
8. Test cross-team data access attempts
```

### AI Edge Cases
```bash
# Test AI system limits
1. Ask complex questions with multiple filters
2. Test edge cases in natural language parsing
3. Verify SQL generation accuracy
4. Test conversation context limits
5. Test document processing with corrupted files
6. Test very large documents (approaching 32MB limit)
7. Test documents with no extractable data
8. Test mixed language inputs (Portuguese/English)
```

## Performance Testing

### Database Performance
```bash
# Test with larger datasets
1. Create 100+ contracts
2. Create 1000+ receivables
3. Test filtering and sorting performance
4. Monitor query execution times
5. Test pagination with large result sets
```

### File Processing Performance
```bash
# Test AI processing speed
1. Time document upload and processing
2. Test concurrent document uploads
3. Monitor memory usage during large file processing
4. Test timeout handling for slow AI responses
```

## Regression Testing

### Known Bug Prevention
```bash
# Test for previously fixed issues
1. Currency precision bug (scroll wheel on number inputs)
2. Date timezone issues (tomorrow's date appearing)
3. Prisma validation errors (empty strings for optional dates)
4. Form consistency across all entity types
5. Overdue calculation accuracy
6. Filter vs display status mismatches
```

### Cross-Entity Consistency
```bash
# Verify identical behavior across entities
1. Currency handling in contracts, receivables, expenses
2. Date handling across all forms
3. Status calculation consistency
4. Filter behavior standardization
5. Error message consistency
```

## Automated Testing Setup

### Test Data Generation
```bash
# Scripts for creating test data
1. Generate realistic contract data
2. Create related receivables and expenses
3. Set up various date scenarios (overdue, upcoming, current)
4. Create data across multiple categories and statuses
```

### Environment Testing
```bash
# Test in different environments
1. Local development (SQLite)
2. Staging (PostgreSQL)
3. Production (PostgreSQL with real data)
4. Different browsers (Chrome, Firefox, Safari)
5. Mobile devices (responsive design)
```

## Quality Gates

### Pre-Deployment Checklist
```bash
# Must pass before deployment
✓ All manual user journeys complete successfully
✓ All API endpoints return expected responses
✓ Form validation works correctly
✓ Currency precision preserved
✓ Date handling accurate
✓ AI integration functional
✓ Export functionality working
✓ No console errors
✓ Responsive design working
✓ Authentication and team isolation working
```

### Success Criteria
- **Functional**: All features work as designed
- **Performance**: Page loads under 3 seconds, API responses under 1 second
- **Accuracy**: Financial calculations are precise
- **Security**: Team isolation is enforced
- **Usability**: Intuitive user experience
- **Reliability**: Graceful error handling

---

*This testing strategy ensures ArqCashflow maintains high quality while supporting rapid development with LLM agents.*