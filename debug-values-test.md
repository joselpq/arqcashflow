# Value Precision Debug Test Plan

## Test Values to Try

Create contracts with these specific values to test precision issues:

### Basic Integers
- 200 (reported to become 198)
- 30000 (reported to become 29997)
- 100
- 1000
- 5000
- 10000

### Decimal Values
- 200.00
- 30000.00
- 123.45
- 1000.50
- 999.99

### Edge Cases
- 0.01
- 0.1
- 1.1
- 10.1
- 100.1

### Large Numbers
- 100000
- 999999
- 1000000

## Debug Log Analysis

When you create each contract, check the browser console for these debug logs:

### 1. Form Level (📝 FORM DEBUG)
- Raw input value (string)
- parseFloat result
- Precision tests

### 2. API Level (🌐 API DEBUG)
- Raw request body totalValue
- After Zod validation
- Data prepared for DB

### 3. Database Level (✅ CONTRACT CREATED)
- Stored totalValue from database
- Type and precision checks

### 4. Fetch Level (📊 DB FETCH DEBUG)
- Values retrieved from database
- Type and precision after fetch

### 5. Frontend Level (🖥️ FRONTEND DEBUG)
- Values after API response
- Formatted display values

### 6. Render Level (🎨 RENDER DEBUG)
- Raw values at render time
- Final display formatting

## Steps to Test

1. Open browser dev tools (F12)
2. Go to Console tab
3. Navigate to localhost:3000/projetos
4. Click "Contratos" tab
5. Click "Adicionar Contrato"
6. Enter test values one by one
7. Watch console output at each step
8. Compare displayed value with input value

## What to Look For

- ❌ Where does the value first change from expected?
- ❌ Is it during parseFloat()?
- ❌ Is it during JSON serialization?
- ❌ Is it during database storage?
- ❌ Is it during database retrieval?
- ❌ Is it during display formatting?

## Expected Patterns

If JavaScript floating-point precision is the issue:
- Values should be exact in string form
- May lose precision during parseFloat()
- PostgreSQL should store as DOUBLE PRECISION (may introduce error)
- Display formatting might compound the issue

## Fixes to Consider

1. **String-based storage**: Store as TEXT/VARCHAR and parse only for calculations
2. **Decimal type**: Use PostgreSQL DECIMAL/NUMERIC for exact precision
3. **Integer cents**: Store as integer cents (multiply by 100)
4. **Big.js/Decimal.js**: Use decimal arithmetic libraries