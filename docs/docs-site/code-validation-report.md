# Code Example Validation Report (Fast)

Generated on: 2025-09-24

## Summary

- **Total markdown files**: 64
- **Total code blocks**: 276
- **Validated code blocks**: 34
- **Skipped code blocks**: 242 (documentation snippets)
- **Valid code blocks**: 29
- **Invalid code blocks**: 5
- **Success rate**: 85.3% (of validated blocks)

## Validation Results

## ❌ Syntax Issues Found (5)

### reference/api/ai-assistant.md - Block 0 (typescript)

**Issue**: Unclosed brackets: (, {, (

**Code preview**:
```typescript
const AssistantRequestSchema = z.object({
  message: z.string().optional(),
  files: z.array(z.object({
    name: z.string(),
    type: z.string(),
  ...
```

---

### reference/api/ai-query.md - Block 0 (typescript)

**Issue**: Unclosed brackets: (, {, (

**Code preview**:
```typescript
const QuerySchema = z.object({
  question: z.string().min(1),
  history: z.array(z.object({
    question: z.string(),
    answer: z.string()
  });
```

---

### reference/api/expenses-by-id-recurring-action.md - Block 0 (typescript)

**Issue**: Unclosed brackets: (, {

**Code preview**:
```typescript
const RecurringActionSchema = z.object({
  action: z.enum(['edit', 'delete']),
  scope: z.enum(['this', 'future', 'all']),
  // For edit actions, incl...
```

---

### reference/api/expenses.md - Block 1 (typescript)

**Issue**: Unclosed brackets: (, {

**Code preview**:
```typescript
const ExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive')...
```

---

### reference/api/recurring-expenses.md - Block 1 (typescript)

**Issue**: Unclosed brackets: (, {, (, {

**Code preview**:
```typescript
const RecurringExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be p...
```

---

## Health Score

**Code Syntax Score**: 85.3% 🟡

---

*This report focuses on basic syntax validation. Many documentation code snippets are intentionally incomplete examples.*
