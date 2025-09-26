# Context-Aware Validation System

## Overview
The ArqCashflow Context-Aware Validation System provides flexible validation based on the execution context, allowing different validation strictness levels for different use cases.

## Validation Levels

### `STRICT` - Database Operations
- **Purpose**: Ensure data integrity for database operations
- **Behavior**: All fields validated, no type coercion, strict business rules
- **Use Cases**: Direct database writes, data migrations, critical operations

### `BALANCED` - API Endpoints
- **Purpose**: Handle user input with reasonable flexibility
- **Behavior**: Required fields validated, type coercion allowed, business rules applied
- **Use Cases**: REST API endpoints, form submissions, user-facing operations

### `FLEXIBLE` - Event Notifications
- **Purpose**: Enable productivity in event-driven architecture
- **Behavior**: Minimal required fields, type coercion, critical rules only
- **Use Cases**: Event emissions, notifications, internal messaging

### `MINIMAL` - Testing/Development
- **Purpose**: Support rapid iteration and testing
- **Behavior**: Only critical fields, maximum coercion, rules can be bypassed
- **Use Cases**: Unit tests, development workflows, prototyping

## Usage Examples

### Basic Context-Aware Validation
```typescript
import { validateWithContext, DEFAULT_CONTEXTS } from '@/lib/validation'

// Strict validation for database
const dbData = validateWithContext(ContractSchema, data, DEFAULT_CONTEXTS.database)

// Flexible validation for events
const eventData = validateWithContext(ContractSchema, data, DEFAULT_CONTEXTS.event)
```

### Creating Context Validators
```typescript
import { createContextValidator } from '@/lib/validation'

const contractValidator = createContextValidator(ContractSchema)

// Use different validation levels
const strictData = contractValidator.strict(data)
const flexibleData = contractValidator.flexible(data)
const customData = contractValidator.withContext(data, customContext)
```

### Automatic Context Detection
```typescript
import { ValidationContextDetector } from '@/lib/validation'

// Auto-detect based on NODE_ENV
const context = ValidationContextDetector.detectContext()

// Detect from source string
const apiContext = ValidationContextDetector.detectFromSource('api/contracts')
```

## Type Coercion Features

### Number Coercion
```typescript
// String numbers converted to numbers in BALANCED/FLEXIBLE contexts
{
  totalValue: "125000" // → 125000 (number)
}
```

### Date Coercion
```typescript
// String dates converted to Date objects
{
  dueDate: "2024-12-31" // → new Date("2024-12-31")
}
```

### String Trimming
```typescript
// Automatic string trimming in all contexts
{
  clientName: "  Client Name  " // → "Client Name"
}
```

## Event System Integration

The event system automatically uses FLEXIBLE validation:

```typescript
// In lib/events/bus.ts
validateWithContext(schema, event, DEFAULT_CONTEXTS.event)
```

This allows events to be emitted with partial data while maintaining type safety.

## Context Configuration

### Custom Contexts
```typescript
const customContext: ValidationContext = {
  level: ValidationLevel.BALANCED,
  source: 'api',
  skipBusinessRules: false,
  allowPartialData: true,
  coerceTypes: true,
  customRules: [
    (data) => data.amount > 0 || 'Amount must be positive'
  ]
}
```

### Environment-Based Detection
- `NODE_ENV=test` → MINIMAL validation
- `NODE_ENV=development` → FLEXIBLE validation
- `NODE_ENV=production` → BALANCED validation (default)

## Middleware Integration

### Express/Next.js Middleware
```typescript
import { validationMiddleware } from '@/lib/validation'

// Use with specific validation level
app.post('/api/contracts',
  validationMiddleware(ContractSchema, ValidationLevel.BALANCED),
  handler
)

// Auto-detect context
app.post('/api/contracts',
  validationMiddleware(ContractSchema),
  handler
)
```

## Schema Compatibility

### Works with Complex Schemas
- ZodObject schemas
- ZodEffects (refined schemas)
- Optional and default fields
- Nested object validation
- Array validation

### Type Coercion Handling
The system intelligently detects:
- Number fields (including refined numbers)
- Date fields
- String fields
- Optional fields
- Default fields

## Architecture Notes

### Non-Invasive Design
- Wraps existing Zod schemas without modification
- Preserves original schema behavior in STRICT mode
- Maintains full type safety

### Performance Considerations
- Context detection is cached
- Schema adjustments are memoized
- Minimal overhead in production

## Known Limitations

### Schema Mismatch Issue
⚠️ **Current Issue**: The base validation schemas expect UUID format but the database uses CUID format.

**Affected Fields**:
```typescript
// Currently incorrect in lib/validation/schemas.ts
teamId: z.string().uuid('Invalid team ID format')

// Should be (CUID format)
teamId: z.string()
  .length(25, 'Invalid team ID format')
  .regex(/^c[a-z0-9]{24}$/, 'Invalid CUID team ID format')
```

This affects all entity ID validations and should be fixed before production use.

## Testing

### Test Files Available
- `test-validation-levels.ts` - Demonstrates all validation levels
- `test-validation-integration.ts` - Integration testing with services
- `test-event-system-final.ts` - Event system with validation

### Testing Patterns
```typescript
// Test different validation contexts
const contexts = [
  { name: 'STRICT', context: DEFAULT_CONTEXTS.database },
  { name: 'BALANCED', context: DEFAULT_CONTEXTS.api },
  { name: 'FLEXIBLE', context: DEFAULT_CONTEXTS.event },
  { name: 'MINIMAL', context: DEFAULT_CONTEXTS.test }
]

contexts.forEach(({ name, context }) => {
  test(`${name} validation`, () => {
    const result = validateWithContext(schema, testData, context)
    // Assert based on expected behavior for each context
  })
})
```

## Implementation Files

### Core Files
- `/lib/validation/context.ts` - Main implementation
- `/lib/validation/schemas.ts` - Base field schemas (needs CUID fix)
- `/lib/validation/index.ts` - Exports and public API

### Integration Files
- `/lib/events/bus.ts` - Event system integration
- `/lib/events/middleware/validation.ts` - Event validation middleware

### Test Files
- `test-validation-*.ts` - Various test suites

## Future Enhancements

1. **Fix CUID validation** - Replace UUID validation with proper CUID format
2. **Enhanced type coercion** - Support for more complex type transformations
3. **Custom validation rules** - More flexible business rule system
4. **Performance optimization** - Schema caching and optimization
5. **Documentation** - API documentation generation