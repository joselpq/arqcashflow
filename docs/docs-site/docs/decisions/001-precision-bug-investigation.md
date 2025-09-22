---
title: "ADR-001: The Precision Bug Investigation"
type: "decision"
audience: ["developer", "agent"]
contexts: ["debugging", "user-experience", "form-handling"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["bug-investigator", "form-developer", "ux-analyst"]
related:
  - developer/testing/strategies.md
  - design/principles.md
dependencies: ["html-forms", "number-inputs", "user-interaction"]
---

# ADR-001: The Precision Bug Investigation

## Context for LLM Agents

**Scope**: Critical bug investigation that revealed a subtle HTML form interaction issue masquerading as a complex technical problem
**Prerequisites**: Understanding of HTML form behavior, number inputs, user interaction patterns, and debugging methodologies
**Key Patterns**:
- User interaction bugs can appear as data corruption issues
- HTML number inputs respond to scroll wheel events by default
- Systematic debugging should include UX observation alongside technical analysis
- Simple solutions often solve complex-appearing problems

## Status
**Resolved** - September 2024

## Context

### The Problem
Users reported mysterious changes to financial values after data entry:
- Input: 200 → Stored: 198
- Input: 600 → Stored: 595 or 597
- Input: 30000 → Stored: 29997
- Input: 1000 → Stored: 997

This was a critical issue in a financial application where precision is paramount.

### Initial Hypothesis
We initially suspected JavaScript floating-point precision issues, leading to extensive investigation of:
- Database storage (PostgreSQL DOUBLE PRECISION)
- API serialization/deserialization
- Prisma ORM conversion
- Object spread timing in form submissions

### Investigation Process

#### Phase 1: Technical Deep Dive
```typescript
// Added comprehensive logging at multiple levels
console.log('Form parseFloat:', parseFloat(value))
console.log('API request body:', JSON.stringify(body))
console.log('Prisma operation:', { value: data.totalValue })
console.log('Database result:', result.totalValue)
```

#### Phase 2: Multiple Fix Attempts
1. **Object preparation pattern**: Separating data object creation from function calls
2. **API endpoint restructuring**: Avoiding direct spread in Prisma calls
3. **Comprehensive value tracking**: Following values through entire pipeline

#### Phase 3: User Observation (Breakthrough)
Instead of focusing purely on code, we observed actual user behavior during data entry.

## Decision

### Root Cause Discovery
The actual problem was **HTML number input scroll wheel behavior**:
- HTML `<input type="number">` responds to scroll wheel events
- When users scroll the page, if the cursor hovers over a number input, the scroll wheel increments/decrements the value
- This happens even when spinners are hidden with CSS
- Users were unknowingly changing values during normal page scrolling

### Solution
```typescript
// Simple, effective solution
<input
  type="number"
  onWheel={(e) => e.currentTarget.blur()}
  // ... other props
/>
```

When the scroll wheel is used over a number input, the input loses focus, preventing value changes.

## Consequences

### Positive
- ✅ **Complete fix**: No more mysterious value changes
- ✅ **Simple solution**: One line of code per number input
- ✅ **No side effects**: Doesn't interfere with intended keyboard input
- ✅ **Universal**: Works across all browsers and devices
- ✅ **Performance**: Zero performance impact

### Lessons Learned
1. **User interaction bugs can masquerade as complex technical issues**
2. **Always observe actual user behavior, not just code behavior**
3. **HTML form elements have hidden behaviors that can cause unexpected UX issues**
4. **Sometimes the simplest explanation (accidental user input) is correct**
5. **Holistic debugging approaches are more effective than pure technical analysis**

### Prevention Strategy
- **Standard practice**: Always disable scroll behavior on number inputs in financial applications
- **User testing**: Test with actual users performing real workflows, not just isolated testing
- **UX investigation**: Consider that "random" data corruption might indicate interaction bugs
- **Systematic approach**: Investigate UI/UX causes before diving deep into data pipeline debugging

## Implementation

### Code Pattern (Required)
```typescript
// All number inputs must include scroll protection
<input
  type="number"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
  onWheel={(e) => e.currentTarget.blur()}  // REQUIRED for financial inputs
  className="..."
/>
```

### Testing Strategy
```typescript
// Test case for precision bug prevention
test('should not change value on scroll', () => {
  render(<NumberInput value={200} onChange={mockOnChange} />);
  const input = screen.getByRole('spinbutton');

  // Simulate scroll wheel over input
  fireEvent.wheel(input, { deltaY: 100 });

  // Value should remain unchanged
  expect(input.value).toBe('200');
  expect(mockOnChange).not.toHaveBeenCalled();
});
```

### Documentation Requirements
- Document this pattern in all form development guides
- Include in code review checklists
- Add to component library as default behavior

## Technical Details

### Browser Behavior Analysis
```javascript
// Default HTML number input behavior
<input type="number" />
// - Responds to scroll wheel events
// - Increments/decrements on wheel scroll
// - Works even with CSS spinner hiding:
//   input[type="number"]::-webkit-outer-spin-button { display: none; }

// Our solution
<input type="number" onWheel={(e) => e.currentTarget.blur()} />
// - Scroll wheel removes focus from input
// - No value change occurs
// - User can still scroll the page normally
// - Keyboard input (arrow keys) still works when focused
```

### Alternative Solutions Considered
1. **preventDefault on wheel events**: More complex, might interfere with scrolling
2. **Custom number input component**: Overkill for this issue
3. **Input masks**: Doesn't solve the core scroll wheel problem
4. **Readonly until clicked**: Poor UX, doesn't solve the issue

## Related Decisions
- **Form validation strategy**: Immediate validation to catch any remaining precision issues
- **Currency handling**: Standardized approach to financial value handling
- **User testing protocols**: Regular testing with real user workflows

## Monitoring
- **User feedback**: Monitor for any reports of unexpected value changes
- **Error tracking**: Log validation failures that might indicate precision issues
- **Code reviews**: Ensure all new number inputs include scroll protection

---

**Key Takeaway**: This case demonstrates how a complex technical investigation can reveal a simple UX problem, emphasizing the importance of holistic debugging approaches that consider user behavior alongside technical implementation.

**For LLM Agents**: When encountering "mysterious" data changes in forms, always consider user interaction patterns before diving into complex technical debugging. The scroll wheel behavior on number inputs is a common gotcha in web development.