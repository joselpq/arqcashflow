---
title: "Date Processing Patterns"
type: "pattern"
audience: ["agent"]
contexts: ["dates", "datetime", "brazilian-locale", "scheduling", "deadlines"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["frontend-developer", "backend-engineer", "data-processor"]
related:
  - agents/contexts/form-handling.md
  - design/principles.md
  - developer/architecture/overview.md
dependencies: ["date-fns", "javascript"]
---

# Date Processing Patterns

## Context for LLM Agents

**Scope**: Comprehensive date handling patterns for ArqCashflow with Brazilian locale support, timezone handling, and business logic
**Prerequisites**: Understanding of JavaScript Date API, timezone concepts, and Brazilian date/time formats
**Key Patterns**:
- Brazilian date format (DD/MM/YYYY) handling
- Timezone-aware date processing
- Business day calculations
- Due date and deadline management
- Date validation and sanitization

## Brazilian Date Format Requirements

**Standard**: ArqCashflow uses Brazilian date formats throughout the application:
- **Display Format**: DD/MM/YYYY (e.g., 24/09/2025)
- **Input Format**: DD/MM/YYYY with flexible parsing
- **API Format**: ISO 8601 strings (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Database**: UTC timestamps, converted to local timezone for display

### Core Date Utilities

```typescript
// lib/utils/date.ts
import { format, parse, isValid, addDays, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class BrazilianDateUtils {
  private static readonly BRAZILIAN_DATE_FORMAT = 'dd/MM/yyyy';
  private static readonly BRAZILIAN_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';
  private static readonly ISO_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";

  /**
   * Format date to Brazilian format (DD/MM/YYYY)
   */
  static formatBrazilian(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (!isValid(dateObj)) {
      return '';
    }

    return format(dateObj, this.BRAZILIAN_DATE_FORMAT, { locale: ptBR });
  }

  /**
   * Format datetime to Brazilian format (DD/MM/YYYY HH:mm)
   */
  static formatBrazilianDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (!isValid(dateObj)) {
      return '';
    }

    return format(dateObj, this.BRAZILIAN_DATETIME_FORMAT, { locale: ptBR });
  }

  /**
   * Parse Brazilian date format to Date object
   */
  static parseBrazilian(dateString: string): Date | null {
    if (!dateString?.trim()) {
      return null;
    }

    try {
      // Handle various Brazilian date formats
      const formats = [
        'dd/MM/yyyy',
        'dd/MM/yy',
        'dd-MM-yyyy',
        'dd-MM-yy',
        'dd.MM.yyyy',
        'dd.MM.yy',
      ];

      for (const formatStr of formats) {
        const parsed = parse(dateString.trim(), formatStr, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      }

      // Try ISO format as fallback
      const isoDate = new Date(dateString);
      if (isValid(isoDate)) {
        return isoDate;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate Brazilian date format
   */
  static isValidBrazilianDate(dateString: string): boolean {
    return this.parseBrazilian(dateString) !== null;
  }

  /**
   * Convert to ISO string for API/database storage
   */
  static toISOString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }

    return dateObj.toISOString();
  }

  /**
   * Get current date in Brazilian format
   */
  static todayBrazilian(): string {
    return this.formatBrazilian(new Date());
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = startOfDay(new Date());
    const dateToCheck = startOfDay(dateObj);

    return today.getTime() === dateToCheck.getTime();
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = startOfDay(new Date());
    const dateToCheck = startOfDay(dateObj);

    return dateToCheck < today;
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = startOfDay(new Date());
    const dateToCheck = startOfDay(dateObj);

    return dateToCheck > today;
  }

  /**
   * Calculate days between dates
   */
  static daysBetween(startDate: Date | string, endDate: Date | string): number {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    return differenceInDays(end, start);
  }

  /**
   * Add business days (Monday-Friday)
   */
  static addBusinessDays(date: Date | string, days: number): Date {
    const startDate = typeof date === 'string' ? new Date(date) : date;
    let currentDate = new Date(startDate);
    let addedDays = 0;

    while (addedDays < days) {
      currentDate = addDays(currentDate, 1);
      const dayOfWeek = currentDate.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        addedDays++;
      }
    }

    return currentDate;
  }

  /**
   * Get relative time description in Portuguese
   */
  static getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInDays = differenceInDays(dateObj, now);

    if (diffInDays === 0) {
      return 'Hoje';
    } else if (diffInDays === 1) {
      return 'Amanhã';
    } else if (diffInDays === -1) {
      return 'Ontem';
    } else if (diffInDays > 0) {
      return `Em ${diffInDays} dias`;
    } else {
      return `${Math.abs(diffInDays)} dias atrás`;
    }
  }
}
```

## Date Input Component Patterns

### 1. **Brazilian Date Input Component**

```typescript
// lib/components/ui/DateInput.tsx
interface DateInputProps {
  value?: Date | string;
  onChange: (date: Date | null) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: Date | string;
  max?: Date | string;
  showRelativeTime?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  label,
  error,
  placeholder = "DD/MM/AAAA",
  required,
  disabled,
  min,
  max,
  showRelativeTime = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [focused, setFocused] = useState(false);

  // Initialize display value
  useEffect(() => {
    if (value) {
      setDisplayValue(BrazilianDateUtils.formatBrazilian(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Parse the date
    const parsedDate = BrazilianDateUtils.parseBrazilian(inputValue);

    if (parsedDate) {
      // Validate against min/max constraints
      if (min && parsedDate < new Date(min)) {
        onChange(new Date(min));
        return;
      }

      if (max && parsedDate > new Date(max)) {
        onChange(new Date(max));
        return;
      }

      onChange(parsedDate);
    } else if (inputValue === '') {
      onChange(null);
    }
  };

  const handleBlur = () => {
    setFocused(false);

    // Reformat on blur if valid date
    if (value) {
      setDisplayValue(BrazilianDateUtils.formatBrazilian(value));
    }
  };

  const currentValue = value instanceof Date ? value : (value ? new Date(value) : null);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm
            focus:ring-blue-500 focus:border-blue-500
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-white'}
          `}
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {showRelativeTime && currentValue && !error && (
        <p className="text-sm text-gray-600">
          {BrazilianDateUtils.getRelativeTime(currentValue)}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
```

### 2. **Date Range Input Component**

```typescript
// lib/components/ui/DateRangeInput.tsx
interface DateRangeInputProps {
  startDate?: Date | string;
  endDate?: Date | string;
  onChange: (startDate: Date | null, endDate: Date | null) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  maxRange?: number; // Maximum days between dates
}

export const DateRangeInput: React.FC<DateRangeInputProps> = ({
  startDate,
  endDate,
  onChange,
  label,
  error,
  required,
  disabled,
  maxRange,
}) => {
  const handleStartDateChange = (date: Date | null) => {
    const currentEndDate = endDate instanceof Date ? endDate : (endDate ? new Date(endDate) : null);

    // If end date is before new start date, clear it
    if (date && currentEndDate && currentEndDate < date) {
      onChange(date, null);
    } else {
      onChange(date, currentEndDate);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    const currentStartDate = startDate instanceof Date ? startDate : (startDate ? new Date(startDate) : null);

    // Validate date range
    if (date && currentStartDate) {
      if (date < currentStartDate) {
        // End date before start date - swap them
        onChange(date, currentStartDate);
        return;
      }

      if (maxRange) {
        const daysBetween = BrazilianDateUtils.daysBetween(currentStartDate, date);
        if (daysBetween > maxRange) {
          // Limit end date to max range
          const maxEndDate = addDays(currentStartDate, maxRange);
          onChange(currentStartDate, maxEndDate);
          return;
        }
      }
    }

    onChange(currentStartDate, date);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="grid grid-cols-2 gap-4">
        <DateInput
          value={startDate}
          onChange={handleStartDateChange}
          placeholder="Data inicial"
          disabled={disabled}
          required={required}
        />

        <DateInput
          value={endDate}
          onChange={handleEndDateChange}
          placeholder="Data final"
          disabled={disabled}
          required={required}
          min={startDate}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
```

## Business Date Logic Patterns

### 1. **Due Date Management**

```typescript
// lib/services/due-date.service.ts
export class DueDateService {
  /**
   * Calculate due date based on payment terms
   */
  static calculateDueDate(
    invoiceDate: Date,
    paymentTerms: PaymentTerms
  ): Date {
    switch (paymentTerms.type) {
      case 'net':
        return addDays(invoiceDate, paymentTerms.days);

      case 'end_of_month':
        const endOfMonth = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 0);
        return addDays(endOfMonth, paymentTerms.additionalDays || 0);

      case 'business_days':
        return BrazilianDateUtils.addBusinessDays(invoiceDate, paymentTerms.days);

      case 'custom':
        return new Date(paymentTerms.customDate);

      default:
        return addDays(invoiceDate, 30); // Default 30 days
    }
  }

  /**
   * Check if payment is overdue
   */
  static isOverdue(dueDate: Date | string, gracePeriod: number = 0): boolean {
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const today = new Date();
    const gracePeriodEnd = addDays(dueDateObj, gracePeriod);

    return today > gracePeriodEnd;
  }

  /**
   * Get overdue days count
   */
  static getOverdueDays(dueDate: Date | string): number {
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const today = new Date();

    if (today <= dueDateObj) {
      return 0;
    }

    return differenceInDays(today, dueDateObj);
  }

  /**
   * Calculate urgency level based on due date
   */
  static getUrgencyLevel(dueDate: Date | string): UrgencyLevel {
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const daysUntilDue = BrazilianDateUtils.daysBetween(new Date(), dueDateObj);

    if (daysUntilDue < 0) {
      return 'overdue';
    } else if (daysUntilDue === 0) {
      return 'due_today';
    } else if (daysUntilDue <= 3) {
      return 'urgent';
    } else if (daysUntilDue <= 7) {
      return 'important';
    } else {
      return 'normal';
    }
  }

  /**
   * Generate installment schedule
   */
  static generateInstallmentSchedule(
    startDate: Date,
    totalAmount: number,
    installmentCount: number,
    frequency: InstallmentFrequency = 'monthly'
  ): InstallmentSchedule[] {
    const schedule: InstallmentSchedule[] = [];
    const installmentAmount = totalAmount / installmentCount;

    for (let i = 0; i < installmentCount; i++) {
      let dueDate: Date;

      switch (frequency) {
        case 'weekly':
          dueDate = addDays(startDate, i * 7);
          break;
        case 'biweekly':
          dueDate = addDays(startDate, i * 14);
          break;
        case 'monthly':
        default:
          dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          break;
      }

      schedule.push({
        installmentNumber: i + 1,
        dueDate,
        amount: installmentAmount,
        status: 'pending',
        urgencyLevel: this.getUrgencyLevel(dueDate),
      });
    }

    // Handle rounding in last installment
    const totalCalculated = installmentAmount * installmentCount;
    const roundingDifference = totalAmount - totalCalculated;

    if (Math.abs(roundingDifference) > 0.01) {
      schedule[schedule.length - 1].amount += roundingDifference;
    }

    return schedule;
  }
}
```

### 2. **Business Day Calculations**

```typescript
// lib/services/business-calendar.service.ts
export class BusinessCalendarService {
  private static readonly BRAZILIAN_HOLIDAYS_2025 = [
    '2025-01-01', // New Year
    '2025-02-24', // Carnaval (Monday)
    '2025-02-25', // Carnaval (Tuesday)
    '2025-04-18', // Good Friday
    '2025-04-21', // Tiradentes
    '2025-05-01', // Labor Day
    '2025-09-07', // Independence Day
    '2025-10-12', // Our Lady of Aparecida
    '2025-11-02', // All Souls' Day
    '2025-11-15', // Proclamation of the Republic
    '2025-12-25', // Christmas
  ];

  /**
   * Check if date is a Brazilian holiday
   */
  static isBrazilianHoliday(date: Date): boolean {
    const dateString = format(date, 'yyyy-MM-dd');
    return this.BRAZILIAN_HOLIDAYS_2025.includes(dateString);
  }

  /**
   * Check if date is a business day (Monday-Friday, not holiday)
   */
  static isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    const isHoliday = this.isBrazilianHoliday(date);

    return !isWeekend && !isHoliday;
  }

  /**
   * Get next business day
   */
  static getNextBusinessDay(date: Date): Date {
    let nextDay = addDays(date, 1);

    while (!this.isBusinessDay(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }

    return nextDay;
  }

  /**
   * Get previous business day
   */
  static getPreviousBusinessDay(date: Date): Date {
    let previousDay = addDays(date, -1);

    while (!this.isBusinessDay(previousDay)) {
      previousDay = addDays(previousDay, -1);
    }

    return previousDay;
  }

  /**
   * Count business days between dates
   */
  static countBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (this.isBusinessDay(currentDate)) {
        count++;
      }
      currentDate = addDays(currentDate, 1);
    }

    return count;
  }

  /**
   * Add business days to a date
   */
  static addBusinessDays(date: Date, businessDays: number): Date {
    let currentDate = new Date(date);
    let remainingDays = businessDays;

    while (remainingDays > 0) {
      currentDate = addDays(currentDate, 1);

      if (this.isBusinessDay(currentDate)) {
        remainingDays--;
      }
    }

    return currentDate;
  }
}
```

## Date Validation Patterns

### 1. **Comprehensive Date Validation**

```typescript
// lib/validation/date.ts
import { z } from 'zod';

export const DateValidation = {
  // Brazilian date string validation
  brazilianDateString: z
    .string()
    .refine(
      (val) => BrazilianDateUtils.isValidBrazilianDate(val),
      'Invalid date format. Use DD/MM/YYYY'
    )
    .transform((val) => BrazilianDateUtils.parseBrazilian(val)),

  // Date object validation
  dateObject: z.date().refine(
    (date) => isValid(date),
    'Invalid date'
  ),

  // Future date validation
  futureDate: z.date().refine(
    (date) => BrazilianDateUtils.isFuture(date),
    'Date must be in the future'
  ),

  // Past date validation
  pastDate: z.date().refine(
    (date) => BrazilianDateUtils.isPast(date),
    'Date must be in the past'
  ),

  // Business date validation
  businessDate: z.date().refine(
    (date) => BusinessCalendarService.isBusinessDay(date),
    'Date must be a business day'
  ),

  // Date range validation
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }).refine(
    ({ startDate, endDate }) => startDate <= endDate,
    'End date must be after start date'
  ),
};

// Usage in schemas
export const ContractSchema = z.object({
  signedDate: DateValidation.pastDate,
  startDate: DateValidation.dateObject,
  endDate: DateValidation.dateObject,
}).refine(
  ({ startDate, endDate }) => startDate <= endDate,
  'Contract end date must be after start date'
);

export const ReceivableSchema = z.object({
  dueDate: DateValidation.futureDate,
  invoiceDate: DateValidation.pastDate,
});
```

### 2. **Runtime Date Validation**

```typescript
// lib/utils/date-validation.ts
export class DateValidator {
  /**
   * Validate date for business logic
   */
  static validateBusinessDate(date: Date | string, context: string): ValidationResult {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const errors: string[] = [];

    if (!isValid(dateObj)) {
      errors.push(`${context} must be a valid date`);
      return { isValid: false, errors, value: date };
    }

    // Check for reasonable date range (1900-2100)
    const year = dateObj.getFullYear();
    if (year < 1900 || year > 2100) {
      errors.push(`${context} must be between 1900 and 2100`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: dateObj,
    };
  }

  /**
   * Validate due date against business rules
   */
  static validateDueDate(
    dueDate: Date,
    invoiceDate: Date,
    maxPaymentTerms: number = 365
  ): ValidationResult {
    const errors: string[] = [];

    // Due date must be after invoice date
    if (dueDate <= invoiceDate) {
      errors.push('Due date must be after invoice date');
    }

    // Check maximum payment terms
    const daysBetween = differenceInDays(dueDate, invoiceDate);
    if (daysBetween > maxPaymentTerms) {
      errors.push(`Payment terms cannot exceed ${maxPaymentTerms} days`);
    }

    // Warn about weekends/holidays
    if (!BusinessCalendarService.isBusinessDay(dueDate)) {
      // This is a warning, not an error
      return {
        isValid: errors.length === 0,
        errors,
        warnings: ['Due date falls on a weekend or holiday'],
        value: dueDate,
      };
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: dueDate,
    };
  }

  /**
   * Sanitize date input
   */
  static sanitizeDate(dateInput: string | Date | null): Date | null {
    if (!dateInput) {
      return null;
    }

    if (dateInput instanceof Date) {
      return isValid(dateInput) ? dateInput : null;
    }

    // Try parsing Brazilian format first
    const parsedBrazilian = BrazilianDateUtils.parseBrazilian(dateInput);
    if (parsedBrazilian) {
      return parsedBrazilian;
    }

    // Try ISO format
    const parsedISO = new Date(dateInput);
    return isValid(parsedISO) ? parsedISO : null;
  }
}
```

## Date Display and Formatting Patterns

### 1. **Context-Aware Date Display**

```typescript
// lib/components/ui/DateDisplay.tsx
interface DateDisplayProps {
  date: Date | string;
  format?: 'short' | 'long' | 'relative' | 'business';
  showTime?: boolean;
  showUrgency?: boolean;
  className?: string;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = 'short',
  showTime = false,
  showUrgency = false,
  className = '',
}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!isValid(dateObj)) {
    return <span className="text-gray-400">Data inválida</span>;
  }

  const formatDate = () => {
    switch (format) {
      case 'short':
        return showTime
          ? BrazilianDateUtils.formatBrazilianDateTime(dateObj)
          : BrazilianDateUtils.formatBrazilian(dateObj);

      case 'long':
        return format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

      case 'relative':
        return BrazilianDateUtils.getRelativeTime(dateObj);

      case 'business':
        const isBusinessDay = BusinessCalendarService.isBusinessDay(dateObj);
        const dateStr = BrazilianDateUtils.formatBrazilian(dateObj);
        return isBusinessDay ? dateStr : `${dateStr} (feriado/fim de semana)`;

      default:
        return BrazilianDateUtils.formatBrazilian(dateObj);
    }
  };

  const getUrgencyClass = () => {
    if (!showUrgency) return '';

    const urgency = DueDateService.getUrgencyLevel(dateObj);
    switch (urgency) {
      case 'overdue':
        return 'text-red-600 font-semibold';
      case 'due_today':
        return 'text-orange-600 font-medium';
      case 'urgent':
        return 'text-yellow-600';
      case 'important':
        return 'text-blue-600';
      default:
        return '';
    }
  };

  return (
    <span className={`${getUrgencyClass()} ${className}`} title={dateObj.toISOString()}>
      {formatDate()}
    </span>
  );
};
```

### 2. **Date Summary Components**

```typescript
// lib/components/ui/DateSummary.tsx
interface DateSummaryProps {
  contracts?: Contract[];
  receivables?: Receivable[];
  expenses?: Expense[];
  period?: 'week' | 'month' | 'quarter';
}

export const DateSummary: React.FC<DateSummaryProps> = ({
  contracts = [],
  receivables = [],
  expenses = [],
  period = 'month',
}) => {
  const now = new Date();
  const periodStart = startOfDay(
    period === 'week'
      ? startOfWeek(now, { locale: ptBR })
      : period === 'month'
      ? startOfMonth(now)
      : startOfQuarter(now)
  );

  const upcomingReceivables = receivables.filter(r =>
    r.dueDate >= now && r.dueDate <= addDays(periodStart, period === 'week' ? 7 : period === 'month' ? 30 : 90)
  );

  const overdueReceivables = receivables.filter(r =>
    DueDateService.isOverdue(r.dueDate)
  );

  const upcomingExpenses = expenses.filter(e =>
    !e.isPaid && e.dueDate >= now && e.dueDate <= addDays(periodStart, period === 'week' ? 7 : 30)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overdue Items */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Em Atraso</h3>
          <p className="text-2xl font-bold text-red-600">
            {overdueReceivables.length}
          </p>
          <p className="text-sm text-red-600">
            {overdueReceivables.length === 1 ? 'recebível' : 'recebíveis'}
          </p>
        </div>

        {/* Due This Week */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium">Próximos 7 Dias</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {upcomingReceivables.filter(r =>
              differenceInDays(r.dueDate, now) <= 7
            ).length}
          </p>
          <p className="text-sm text-yellow-600">vencimentos</p>
        </div>

        {/* Due This Month */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-medium">Este Mês</h3>
          <p className="text-2xl font-bold text-blue-600">
            {upcomingReceivables.length}
          </p>
          <p className="text-sm text-blue-600">
            {upcomingReceivables.length === 1 ? 'recebível' : 'recebíveis'}
          </p>
        </div>
      </div>

      {/* Upcoming Items List */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Próximos Vencimentos</h4>
        {upcomingReceivables.slice(0, 5).map(receivable => (
          <div key={receivable.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-sm">{receivable.description}</span>
            <DateDisplay
              date={receivable.dueDate}
              format="relative"
              showUrgency
              className="text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Testing Patterns

### 1. **Date Utility Testing**

```typescript
// tests/date-utils.test.ts
describe('Brazilian Date Utils', () => {
  describe('formatting', () => {
    it('should format dates in Brazilian format', () => {
      const date = new Date('2025-09-24T10:30:00Z');
      expect(BrazilianDateUtils.formatBrazilian(date)).toBe('24/09/2025');
    });

    it('should format datetime in Brazilian format', () => {
      const date = new Date('2025-09-24T15:30:00Z');
      expect(BrazilianDateUtils.formatBrazilianDateTime(date)).toMatch(/24\/09\/2025 \d{2}:\d{2}/);
    });
  });

  describe('parsing', () => {
    it('should parse various Brazilian date formats', () => {
      expect(BrazilianDateUtils.parseBrazilian('24/09/2025')).toEqual(
        new Date(2025, 8, 24) // Month is 0-indexed
      );
      expect(BrazilianDateUtils.parseBrazilian('24-09-2025')).toBeDefined();
      expect(BrazilianDateUtils.parseBrazilian('24.09.2025')).toBeDefined();
    });

    it('should return null for invalid dates', () => {
      expect(BrazilianDateUtils.parseBrazilian('invalid')).toBeNull();
      expect(BrazilianDateUtils.parseBrazilian('32/13/2025')).toBeNull();
    });
  });

  describe('relative time', () => {
    it('should return correct relative time descriptions', () => {
      const today = new Date();
      const tomorrow = addDays(today, 1);
      const yesterday = addDays(today, -1);

      expect(BrazilianDateUtils.getRelativeTime(today)).toBe('Hoje');
      expect(BrazilianDateUtils.getRelativeTime(tomorrow)).toBe('Amanhã');
      expect(BrazilianDateUtils.getRelativeTime(yesterday)).toBe('Ontem');
    });
  });
});

describe('Due Date Service', () => {
  it('should calculate due dates correctly', () => {
    const invoiceDate = new Date('2025-01-15');
    const paymentTerms: PaymentTerms = { type: 'net', days: 30 };

    const dueDate = DueDateService.calculateDueDate(invoiceDate, paymentTerms);

    expect(dueDate).toEqual(new Date('2025-02-14'));
  });

  it('should detect overdue payments', () => {
    const pastDate = addDays(new Date(), -5);
    const futureDate = addDays(new Date(), 5);

    expect(DueDateService.isOverdue(pastDate)).toBe(true);
    expect(DueDateService.isOverdue(futureDate)).toBe(false);
  });

  it('should calculate urgency levels correctly', () => {
    const overdue = addDays(new Date(), -1);
    const dueToday = new Date();
    const urgent = addDays(new Date(), 2);
    const normal = addDays(new Date(), 10);

    expect(DueDateService.getUrgencyLevel(overdue)).toBe('overdue');
    expect(DueDateService.getUrgencyLevel(dueToday)).toBe('due_today');
    expect(DueDateService.getUrgencyLevel(urgent)).toBe('urgent');
    expect(DueDateService.getUrgencyLevel(normal)).toBe('normal');
  });
});
```

### 2. **Component Testing**

```typescript
// tests/components/DateInput.test.tsx
describe('DateInput Component', () => {
  it('should format input value on blur', () => {
    const mockOnChange = jest.fn();
    render(<DateInput onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '24/09/2025' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('24/09/2025');
    expect(mockOnChange).toHaveBeenCalledWith(new Date(2025, 8, 24));
  });

  it('should show relative time when enabled', () => {
    const tomorrow = addDays(new Date(), 1);
    render(
      <DateInput
        value={tomorrow}
        onChange={jest.fn()}
        showRelativeTime
      />
    );

    expect(screen.getByText('Amanhã')).toBeInTheDocument();
  });

  it('should validate date constraints', () => {
    const mockOnChange = jest.fn();
    const maxDate = new Date('2025-12-31');

    render(
      <DateInput
        onChange={mockOnChange}
        max={maxDate}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '01/01/2026' } }); // Beyond max

    // Should be constrained to max date
    expect(mockOnChange).toHaveBeenCalledWith(maxDate);
  });
});
```

## Related Documentation

- [Form Handling Context](../contexts/form-handling.md) - Form implementation patterns
- [Design Principles](../../design/principles.md) - UI design guidelines
- [Architecture Overview](../../developer/architecture/overview.md) - System design context

---

*These patterns ensure consistent, localized, and business-appropriate date handling throughout ArqCashflow.*