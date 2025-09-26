# Recurring Expense Full Series Generation

## Overview

The ArqCashflow platform now supports **full series generation** for recurring expenses. When you create a recurring expense, the system immediately generates all expense instances upfront (up to 2 years or until the specified end date), providing complete visibility of your financial timeline.

## Key Features

### 1. **Automatic Full Series Generation**
- Creates all expense instances immediately upon recurring expense creation
- Past expenses are automatically marked as "paid"
- Future expenses remain as "pending"
- Respects the 2-year cap or end date, whichever comes first

### 2. **Series Management Scopes**
When updating or deleting expenses from a recurring series, you can choose:
- **Single**: Affects only the selected expense instance
- **Future**: Affects all future unpaid expenses in the series
- **All**: Affects all expenses in the series (past and future)

### 3. **Intelligent Regeneration**
- If you change the frequency or interval, you can regenerate the series
- Option to preserve paid expenses when regenerating
- Automatically handles date calculations for different frequencies

## Implementation Details

### Service Layer Changes

The `RecurringExpenseService` now includes:

```typescript
// Generate full series on creation
async create(data: RecurringExpenseCreateData): Promise<RecurringExpenseWithRelations> {
  // Creates the recurring expense template
  // Then immediately generates all expense instances
  const seriesResult = await this.generateFullSeries(recurringExpense.id)
}

// Update series with different scopes
async updateExpenseSeries(
  recurringExpenseId: string,
  data: RecurringExpenseUpdateData,
  updateScope: SeriesUpdateScope
): Promise<{ updatedCount: number }>

// Delete series with different scopes
async deleteExpenseSeries(
  recurringExpenseId: string,
  deleteScope: SeriesUpdateScope
): Promise<{ deletedCount: number }>

// Regenerate when frequency changes
async regenerateSeries(
  recurringExpenseId: string,
  preservePaidExpenses = true
): Promise<SeriesGenerationResult>
```

### API Endpoints

New endpoints for series management:

```
# Update expense series
PATCH /api/recurring-expenses/{id}/series
Body: {
  scope: "single" | "future" | "all",
  targetExpenseId?: string, // Required for "single" scope
  amount?: number,
  description?: string,
  // ... other update fields
}

# Delete expense series
DELETE /api/recurring-expenses/{id}/series?scope=future

# Regenerate series
POST /api/recurring-expenses/{id}/series
Body: {
  action: "regenerate",
  preservePaidExpenses: boolean
}
```

### Database Impact

- No schema changes required
- Uses existing `Expense` table with `recurringExpenseId` reference
- Maintains backward compatibility with existing data

## Migration Strategy

### For New Recurring Expenses
- Automatically use full series generation
- No additional configuration needed

### For Existing Recurring Expenses
- Continue working with current cron-based generation
- Optional migration available via regenerate API
- Backward compatible - no breaking changes

## Performance Considerations

- **Series Limit**: Maximum 100 instances or 2 years
- **Bulk Operations**: Optimized for batch create/update/delete
- **Team Isolation**: All operations respect team boundaries
- **Audit Logging**: All series operations are audited

## Testing

Run the test suite to verify functionality:

```bash
# Run full series generation tests
npx tsx test-full-series-generation.ts

# Test scenarios covered:
# - Monthly recurring expenses (28 instances)
# - Weekly recurring with end date (7 instances)
# - Annual recurring (3 instances)
# - Series updates (future only)
# - Series deletion (future only)
```

## Benefits

1. **Immediate Visibility**: See all future expenses instantly
2. **Better Planning**: Complete financial timeline available
3. **Flexible Management**: Update/delete with granular control
4. **Historical Accuracy**: Past expenses auto-marked as paid
5. **No Cron Dependency**: Reduces reliance on scheduled jobs

## Future Enhancements

- [ ] UI components for series visualization
- [ ] Bulk edit interface for series management
- [ ] Series templates for common patterns
- [ ] Export series to spreadsheet
- [ ] Series conflict detection

## Architecture Compliance

✅ **Validation**: Uses `lib/validation/financial.ts` schemas
✅ **Services**: All logic in `RecurringExpenseService`
✅ **Team Context**: Enforced via `withTeamContext` middleware
✅ **Audit**: All operations logged via audit middleware
✅ **Testing**: Comprehensive test coverage

---

*Last Updated: 2025-09-26*
*Implementation Status: Backend Complete, UI Pending*