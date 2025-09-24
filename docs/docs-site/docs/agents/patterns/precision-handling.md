---
title: "Precision Handling Patterns"
type: "pattern"
audience: ["agent"]
contexts: ["precision", "financial", "currency", "numbers", "bug-prevention"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["frontend-developer", "form-developer", "financial-engineer"]
related:
  - decisions/001-precision-bug-investigation.md
  - agents/contexts/form-handling.md
  - design/principles.md
dependencies: ["react", "javascript"]
---

# Precision Handling Patterns

## Context for LLM Agents

**Scope**: Proven patterns for handling financial precision in ArqCashflow, preventing data corruption in currency and numerical fields
**Prerequisites**: Understanding of JavaScript number precision issues, React event handling, and financial data requirements
**Key Patterns**:
- Scroll wheel protection for number inputs (CRITICAL)
- Currency formatting and parsing
- Financial calculation precision
- Validation patterns for financial data

## Critical Pattern: Scroll Wheel Protection

**🚨 CRITICAL**: This pattern MUST be applied to every number input in ArqCashflow to prevent accidental value changes.

### The Problem
Users accidentally change financial values when scrolling over number inputs, causing:
- Data corruption in contracts, receivables, and expenses
- Loss of user trust in data accuracy
- Potential financial losses due to incorrect values

### The Solution Pattern

```typescript
// ALWAYS use this pattern for number inputs
const SafeNumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  onWheel,
  ...props
}) => {
  return (
    <input
      type="number"
      value={value}
      onChange={onChange}
      onWheel={(e) => {
        // CRITICAL: Always blur on wheel event
        e.currentTarget.blur();

        // Still allow custom wheel handlers
        onWheel?.(e);
      }}
      {...props}
    />
  );
};

// Usage in forms
<SafeNumberInput
  value={contractValue}
  onChange={(e) => setContractValue(Number(e.target.value))}
  placeholder="Enter contract value"
/>
```

### Implementation Strategies

#### 1. **Component Library Approach**

```typescript
// lib/components/ui/NumberInput.tsx
interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  onValueChange?: (value: number) => void; // Alternative callback
  allowDecimals?: boolean;
  maxDecimals?: number;
  min?: number;
  max?: number;
  prefix?: string; // e.g., "R$"
  suffix?: string; // e.g., "%"
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  onValueChange,
  allowDecimals = true,
  maxDecimals = 2,
  min,
  max,
  prefix,
  suffix,
  onWheel,
  className,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(value.toString());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Remove non-numeric characters (except decimal point)
    if (allowDecimals) {
      newValue = newValue.replace(/[^0-9.-]/g, '');
    } else {
      newValue = newValue.replace(/[^0-9-]/g, '');
    }

    // Limit decimal places
    if (allowDecimals && maxDecimals > 0) {
      const parts = newValue.split('.');
      if (parts[1] && parts[1].length > maxDecimals) {
        parts[1] = parts[1].substring(0, maxDecimals);
        newValue = parts.join('.');
      }
    }

    setDisplayValue(newValue);

    // Convert to number and validate
    const numericValue = parseFloat(newValue) || 0;

    // Apply min/max constraints
    let constrainedValue = numericValue;
    if (min !== undefined && constrainedValue < min) {
      constrainedValue = min;
    }
    if (max !== undefined && constrainedValue > max) {
      constrainedValue = max;
    }

    onChange(constrainedValue);
    onValueChange?.(constrainedValue);
  };

  return (
    <div className="relative">
      {prefix && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">{prefix}</span>
        </div>
      )}

      <input
        type="number"
        value={displayValue}
        onChange={handleChange}
        onWheel={(e) => {
          // CRITICAL: Prevent scroll-based value changes
          e.currentTarget.blur();
          onWheel?.(e);
        }}
        className={`
          block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
          focus:ring-blue-500 focus:border-blue-500
          ${prefix ? 'pl-8' : ''}
          ${suffix ? 'pr-8' : ''}
          ${className}
        `}
        {...props}
      />

      {suffix && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">{suffix}</span>
        </div>
      )}
    </div>
  );
};
```

#### 2. **Hook-Based Approach**

```typescript
// lib/hooks/useNumberInput.ts
interface UseNumberInputOptions {
  initialValue?: number;
  min?: number;
  max?: number;
  maxDecimals?: number;
  allowNegative?: boolean;
}

export function useNumberInput({
  initialValue = 0,
  min,
  max,
  maxDecimals = 2,
  allowNegative = false,
}: UseNumberInputOptions = {}) {
  const [value, setValue] = useState<number>(initialValue);
  const [displayValue, setDisplayValue] = useState<string>(initialValue.toString());
  const [error, setError] = useState<string>('');

  const updateValue = useCallback((newValue: string) => {
    // Clear previous errors
    setError('');

    // Validate input format
    const numericValue = parseFloat(newValue);

    if (isNaN(numericValue)) {
      setError('Please enter a valid number');
      setDisplayValue(newValue); // Keep invalid input visible
      return;
    }

    // Apply constraints
    if (!allowNegative && numericValue < 0) {
      setError('Value cannot be negative');
      return;
    }

    if (min !== undefined && numericValue < min) {
      setError(`Value must be at least ${min}`);
      return;
    }

    if (max !== undefined && numericValue > max) {
      setError(`Value cannot exceed ${max}`);
      return;
    }

    // Update both values
    setValue(numericValue);
    setDisplayValue(newValue);
  }, [min, max, allowNegative]);

  const inputProps = {
    type: 'number' as const,
    value: displayValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      updateValue(e.target.value);
    },
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => {
      // CRITICAL: Prevent accidental changes
      e.currentTarget.blur();
    },
  };

  const reset = useCallback(() => {
    setValue(initialValue);
    setDisplayValue(initialValue.toString());
    setError('');
  }, [initialValue]);

  return {
    value,
    displayValue,
    error,
    inputProps,
    updateValue,
    reset,
    isValid: !error,
  };
}

// Usage in components
const ContractForm = () => {
  const totalValue = useNumberInput({
    initialValue: 0,
    min: 0,
    max: 100000000, // R$ 100M limit
    maxDecimals: 2,
  });

  return (
    <form>
      <label htmlFor="totalValue">Contract Value</label>
      <input
        id="totalValue"
        {...totalValue.inputProps}
        placeholder="Enter contract value"
      />
      {totalValue.error && (
        <p className="text-red-600 text-sm mt-1">{totalValue.error}</p>
      )}
    </form>
  );
};
```

## Currency Formatting Patterns

### 1. **Brazilian Real (R$) Formatting**

```typescript
// lib/utils/currency.ts
export class CurrencyFormatter {
  private static readonly BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private static readonly NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  /**
   * Format number as Brazilian currency (R$ 1.234,56)
   */
  static formatBRL(amount: number): string {
    if (!Number.isFinite(amount)) {
      return 'R$ 0,00';
    }
    return this.BRL_FORMATTER.format(amount);
  }

  /**
   * Format number with Brazilian number format (1.234,56)
   */
  static formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '0,00';
    }
    return this.NUMBER_FORMATTER.format(value);
  }

  /**
   * Parse Brazilian formatted currency string to number
   */
  static parseBRL(formatted: string): number {
    // Remove currency symbol and normalize
    const normalized = formatted
      .replace(/R\$\s?/, '') // Remove R$ symbol
      .replace(/\./g, '') // Remove thousands separators
      .replace(',', '.'); // Replace decimal comma with dot

    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * Validate if string is a valid currency format
   */
  static isValidCurrency(value: string): boolean {
    const parsed = this.parseBRL(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }
}

// Usage examples
CurrencyFormatter.formatBRL(1234.56); // "R$ 1.234,56"
CurrencyFormatter.formatNumber(1234.56); // "1.234,56"
CurrencyFormatter.parseBRL("R$ 1.234,56"); // 1234.56
CurrencyFormatter.isValidCurrency("R$ 1.234,56"); // true
```

### 2. **Currency Input Component**

```typescript
// lib/components/ui/CurrencyInput.tsx
interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  label,
  error,
  placeholder = "0,00",
  required,
  disabled,
  min = 0,
  max = 100000000,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    value ? CurrencyFormatter.formatNumber(value) : ''
  );
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Parse to number for validation and callback
    const numericValue = CurrencyFormatter.parseBRL(`R$ ${inputValue}`);

    // Apply constraints
    if (numericValue < min) {
      onChange(min);
    } else if (numericValue > max) {
      onChange(max);
    } else {
      onChange(numericValue);
    }
  };

  const handleFocus = () => {
    setFocused(true);
    // Show raw number format when focused
    if (value > 0) {
      setDisplayValue(value.toString().replace('.', ','));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    // Format as currency when not focused
    if (value > 0) {
      setDisplayValue(CurrencyFormatter.formatNumber(value));
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">R$</span>
        </div>

        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onWheel={(e) => e.currentTarget.blur()} // CRITICAL: Precision protection
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            block w-full pl-10 px-3 py-2 border rounded-md shadow-sm
            focus:ring-blue-500 focus:border-blue-500
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-white'}
          `}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
```

## Financial Calculation Patterns

### 1. **Precise Decimal Math**

```typescript
// lib/utils/decimal-math.ts
/**
 * Precise decimal math utilities for financial calculations
 * Avoids JavaScript floating-point precision issues
 */
export class DecimalMath {
  private static readonly PRECISION = 100; // 2 decimal places

  /**
   * Add two decimal numbers with precision
   */
  static add(a: number, b: number): number {
    return Math.round((a * this.PRECISION + b * this.PRECISION)) / this.PRECISION;
  }

  /**
   * Subtract two decimal numbers with precision
   */
  static subtract(a: number, b: number): number {
    return Math.round((a * this.PRECISION - b * this.PRECISION)) / this.PRECISION;
  }

  /**
   * Multiply two decimal numbers with precision
   */
  static multiply(a: number, b: number): number {
    return Math.round((a * b * this.PRECISION)) / this.PRECISION;
  }

  /**
   * Divide two decimal numbers with precision
   */
  static divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return Math.round((a / b * this.PRECISION)) / this.PRECISION;
  }

  /**
   * Calculate percentage of a value
   */
  static percentage(value: number, percentage: number): number {
    return this.multiply(value, percentage / 100);
  }

  /**
   * Round to specific decimal places
   */
  static round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Sum array of numbers with precision
   */
  static sum(numbers: number[]): number {
    return numbers.reduce((acc, num) => this.add(acc, num), 0);
  }
}

// Usage examples
DecimalMath.add(0.1, 0.2); // 0.3 (not 0.30000000000000004)
DecimalMath.multiply(1234.56, 0.1); // 123.46 (precise)
DecimalMath.percentage(1000, 15); // 150.00
DecimalMath.sum([100.10, 200.20, 300.30]); // 600.60
```

### 2. **Financial Calculation Service**

```typescript
// lib/services/financial-calculations.ts
export class FinancialCalculations {
  /**
   * Calculate contract installments
   */
  static calculateInstallments(
    totalValue: number,
    installmentCount: number,
    startDate: Date
  ): Installment[] {
    const installmentValue = DecimalMath.divide(totalValue, installmentCount);
    const installments: Installment[] = [];

    for (let i = 0; i < installmentCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      installments.push({
        installmentNumber: i + 1,
        amount: installmentValue,
        dueDate,
        status: 'pending',
      });
    }

    // Handle rounding difference in last installment
    const totalCalculated = DecimalMath.multiply(installmentValue, installmentCount);
    const difference = DecimalMath.subtract(totalValue, totalCalculated);

    if (Math.abs(difference) > 0) {
      installments[installments.length - 1].amount = DecimalMath.add(
        installmentValue,
        difference
      );
    }

    return installments;
  }

  /**
   * Calculate cash flow projection
   */
  static calculateCashFlow(
    contracts: Contract[],
    receivables: Receivable[],
    expenses: Expense[]
  ): CashFlowProjection {
    const income = DecimalMath.sum(
      receivables.filter(r => r.status === 'pending').map(r => r.amount)
    );

    const outgoing = DecimalMath.sum(
      expenses.filter(e => !e.isPaid).map(e => e.amount)
    );

    const netCashFlow = DecimalMath.subtract(income, outgoing);

    return {
      totalIncome: income,
      totalExpenses: outgoing,
      netCashFlow,
      projectionDate: new Date(),
    };
  }

  /**
   * Calculate project profitability
   */
  static calculateProfitability(
    contractValue: number,
    totalExpenses: number
  ): ProjectProfitability {
    const profit = DecimalMath.subtract(contractValue, totalExpenses);
    const profitMargin = contractValue > 0
      ? DecimalMath.percentage(profit / contractValue, 100)
      : 0;

    return {
      revenue: contractValue,
      expenses: totalExpenses,
      profit,
      profitMargin,
      isProfiable: profit > 0,
    };
  }
}
```

## Validation Patterns

### 1. **Financial Data Validation**

```typescript
// lib/validation/financial.ts
import { z } from 'zod';

export const FinancialValidation = {
  // Base amount validation
  amount: z
    .number()
    .min(0, 'Amount cannot be negative')
    .max(100000000, 'Amount exceeds maximum allowed value')
    .refine(
      (val) => Number.isFinite(val),
      'Amount must be a valid number'
    )
    .refine(
      (val) => {
        // Check for reasonable precision (max 2 decimal places)
        const str = val.toString();
        const decimalPart = str.split('.')[1];
        return !decimalPart || decimalPart.length <= 2;
      },
      'Amount cannot have more than 2 decimal places'
    ),

  // Percentage validation
  percentage: z
    .number()
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100%')
    .refine(
      (val) => Number.isFinite(val),
      'Percentage must be a valid number'
    ),

  // Contract value validation
  contractValue: z
    .number()
    .min(1, 'Contract value must be greater than zero')
    .max(100000000, 'Contract value exceeds maximum allowed')
    .refine(
      (val) => val % 0.01 === 0 || Math.abs(val % 0.01) < 0.001,
      'Contract value must have at most 2 decimal places'
    ),

  // Installment count validation
  installmentCount: z
    .number()
    .int('Installment count must be a whole number')
    .min(1, 'Must have at least 1 installment')
    .max(120, 'Cannot exceed 120 installments'), // 10 years max
};

// Usage in schemas
export const ContractSchema = z.object({
  totalValue: FinancialValidation.contractValue,
  installmentCount: FinancialValidation.installmentCount.optional(),
  // ... other fields
});
```

### 2. **Runtime Financial Validation**

```typescript
// lib/utils/financial-validation.ts
export class FinancialValidator {
  /**
   * Validate financial amount for data integrity
   */
  static validateAmount(amount: number, context: string = 'amount'): ValidationResult {
    const errors: string[] = [];

    if (!Number.isFinite(amount)) {
      errors.push(`${context} must be a valid number`);
    }

    if (amount < 0) {
      errors.push(`${context} cannot be negative`);
    }

    if (amount > 100000000) { // R$ 100M
      errors.push(`${context} exceeds maximum allowed value`);
    }

    // Check for precision issues
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push(`${context} cannot have more than 2 decimal places`);
    }

    // Check for suspicious values (potential precision bug)
    if (amount > 0 && amount < 0.01) {
      errors.push(`${context} is suspiciously small`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: amount,
    };
  }

  /**
   * Sanitize amount to prevent precision issues
   */
  static sanitizeAmount(amount: number): number {
    if (!Number.isFinite(amount)) {
      return 0;
    }

    // Round to 2 decimal places
    return DecimalMath.round(amount, 2);
  }

  /**
   * Detect potential precision bug patterns
   */
  static detectPrecisionBug(
    oldValue: number,
    newValue: number,
    timeWindow: number = 1000 // 1 second
  ): PrecisionBugSuspicion {
    const timeSinceChange = Date.now() - timeWindow;
    const valueDifference = Math.abs(newValue - oldValue);

    // Suspicious patterns:
    // 1. Small incremental changes (wheel scroll)
    // 2. Multiple rapid changes
    // 3. Changes to very large numbers

    const isIncrementalChange = valueDifference === 1 || valueDifference === 0.01;
    const isRapidChange = timeSinceChange < timeWindow;
    const isLargeNumber = oldValue > 1000000; // > R$ 1M

    const suspicionLevel =
      (isIncrementalChange ? 30 : 0) +
      (isRapidChange ? 20 : 0) +
      (isLargeNumber ? 25 : 0);

    return {
      isSuspicious: suspicionLevel > 50,
      suspicionLevel,
      patterns: {
        incrementalChange: isIncrementalChange,
        rapidChange: isRapidChange,
        largeNumber: isLargeNumber,
      },
      recommendation: suspicionLevel > 50
        ? 'Possible precision bug - verify user intention'
        : 'Change appears normal',
    };
  }
}
```

## Testing Patterns

### 1. **Precision Bug Testing**

```typescript
// tests/precision-handling.test.ts
describe('Precision Handling', () => {
  describe('Scroll Wheel Protection', () => {
    it('should blur input on wheel event', () => {
      render(<SafeNumberInput value={1000} onChange={jest.fn()} />);

      const input = screen.getByRole('spinbutton');
      input.focus();

      expect(input).toHaveFocus();

      fireEvent.wheel(input, { deltaY: 100 });

      expect(input).not.toHaveFocus();
    });

    it('should not change value on wheel event', () => {
      const mockOnChange = jest.fn();
      render(<SafeNumberInput value={1000} onChange={mockOnChange} />);

      const input = screen.getByRole('spinbutton');
      fireEvent.wheel(input, { deltaY: 100 });

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Currency Formatting', () => {
    it('should format Brazilian currency correctly', () => {
      expect(CurrencyFormatter.formatBRL(1234.56)).toBe('R$ 1.234,56');
      expect(CurrencyFormatter.formatBRL(0)).toBe('R$ 0,00');
      expect(CurrencyFormatter.formatBRL(-100)).toBe('-R$ 100,00');
    });

    it('should parse Brazilian currency correctly', () => {
      expect(CurrencyFormatter.parseBRL('R$ 1.234,56')).toBe(1234.56);
      expect(CurrencyFormatter.parseBRL('1.234,56')).toBe(1234.56);
      expect(CurrencyFormatter.parseBRL('0,00')).toBe(0);
    });
  });

  describe('Decimal Math', () => {
    it('should handle floating point precision correctly', () => {
      expect(DecimalMath.add(0.1, 0.2)).toBe(0.3);
      expect(DecimalMath.subtract(1.1, 0.1)).toBe(1.0);
      expect(DecimalMath.multiply(0.1, 3)).toBe(0.3);
    });

    it('should calculate percentages accurately', () => {
      expect(DecimalMath.percentage(1000, 15)).toBe(150);
      expect(DecimalMath.percentage(1234.56, 10)).toBe(123.46);
    });
  });
});
```

### 2. **Financial Validation Testing**

```typescript
describe('Financial Validation', () => {
  describe('Amount Validation', () => {
    it('should validate positive amounts', () => {
      const result = FinancialValidator.validateAmount(1234.56);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative amounts', () => {
      const result = FinancialValidator.validateAmount(-100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount cannot be negative');
    });

    it('should reject excessive decimal places', () => {
      const result = FinancialValidator.validateAmount(123.456);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount cannot have more than 2 decimal places');
    });
  });

  describe('Precision Bug Detection', () => {
    it('should detect suspicious incremental changes', () => {
      const result = FinancialValidator.detectPrecisionBug(1000, 1001, 100);
      expect(result.isSuspicious).toBe(true);
      expect(result.patterns.incrementalChange).toBe(true);
    });

    it('should not flag legitimate changes', () => {
      const result = FinancialValidator.detectPrecisionBug(1000, 1500, 5000);
      expect(result.isSuspicious).toBe(false);
    });
  });
});
```

## Related Documentation

- [Precision Bug Investigation ADR](../../decisions/001-precision-bug-investigation.md) - Detailed case study
- [Form Handling Context](../contexts/form-handling.md) - Form implementation patterns
- [Design Principles](../../design/principles.md) - UI design guidelines

---

*These patterns ensure financial data remains precise and accurate throughout ArqCashflow, preventing costly data corruption bugs.*