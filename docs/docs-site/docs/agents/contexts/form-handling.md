---
title: "Form Handling Context for LLM Agents"
type: "context"
audience: ["agent"]
contexts: ["forms", "validation", "precision", "user-interaction"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["form-developer", "validation-engineer", "ui-developer"]
related:
  - developer/architecture/overview.md
  - decisions/001-precision-bug-investigation.md
  - design/principles.md
dependencies: ["react", "zod", "tailwind"]
---

# Form Handling Context for LLM Agents

## Context for LLM Agents

**Scope**: Comprehensive context for building forms in ArqCashflow with focus on precision handling, validation patterns, and user experience
**Prerequisites**: Understanding of React forms, Zod validation, and precision number handling issues
**Key Patterns**:
- Precision bug prevention with scroll behavior fixes
- Zod schema validation with financial data types
- Team-based form security patterns
- Progressive disclosure and user guidance
- Accessibility-first form design

## Critical Pattern: Precision Bug Prevention

### The Scroll Wheel Problem
**Issue**: Users accidentally changing number input values when scrolling over forms, causing data corruption in financial fields.

**Solution Pattern** (ALWAYS implement):
```typescript
// CRITICAL: Always add this to number inputs
<input
  type="number"
  onWheel={(e) => e.currentTarget.blur()}
  // ... other props
/>
```

**Context**: This pattern was discovered during precision bug investigation and must be applied to ALL number inputs in ArqCashflow.

### Affected Components
Apply scroll-blur pattern to:
- Financial amount fields (contracts, receivables, expenses)
- Quantity fields
- Percentage fields
- Any numeric input where precision matters

## Form Architecture Patterns

### 1. **Form State Management**

**Pattern**: Use controlled components with proper validation
```typescript
const [formData, setFormData] = useState({
  amount: '',
  clientName: '',
  teamId: user.teamId // Always include team context
});

// Handle changes with validation
const handleChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  // Clear previous errors for this field
  setErrors(prev => ({ ...prev, [field]: '' }));
};
```

### 2. **Validation Schema Pattern**

**Financial Form Schema Example**:
```typescript
import { z } from 'zod';

const ContractFormSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  projectName: z.string().min(1, 'Project name is required'),
  totalValue: z.number().positive('Amount must be positive'),
  signedDate: z.string().min(1, 'Date is required'),
  teamId: z.string().uuid(), // Security: Always validate team context
});

type ContractFormData = z.infer<typeof ContractFormSchema>;
```

### 3. **Team Security Pattern**

**CRITICAL**: Every form submission must include and validate team context:
```typescript
const handleSubmit = async (data: FormData) => {
  // Validate team access
  if (data.teamId !== user.teamId) {
    throw new Error('Unauthorized team access');
  }

  // Submit with team context
  await createContract({
    ...data,
    teamId: user.teamId, // Server-side will validate this
  });
};
```

## Form Component Patterns

### 1. **Input Component Structure**

```typescript
interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: 'text' | 'number' | 'email' | 'date';
  required?: boolean;
  placeholder?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  error,
  type = 'text',
  required,
  placeholder
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onWheel={type === 'number' ? (e) => e.currentTarget.blur() : undefined}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        placeholder={placeholder}
        required={required}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
```

### 2. **Currency Input Pattern**

```typescript
const CurrencyInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}> = ({ label, value, onChange, error }) => {
  const [displayValue, setDisplayValue] = useState(
    value ? value.toString() : ''
  );

  const handleChange = (inputValue: string) => {
    setDisplayValue(inputValue);
    const numericValue = parseFloat(inputValue.replace(/[^\d.-]/g, ''));
    if (!isNaN(numericValue)) {
      onChange(numericValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">R$</span>
        </div>
        <input
          type="number"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()} // CRITICAL: Precision bug fix
          className={`block w-full pl-10 px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="0,00"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
```

## Validation Patterns

### 1. **Client-Side Validation**

```typescript
const validateForm = (data: FormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Use Zod for comprehensive validation
  const result = FormSchema.safeParse(data);

  if (!result.success) {
    result.error.errors.forEach((error) => {
      const field = error.path[0] as string;
      errors[field] = error.message;
    });
  }

  return errors;
};
```

### 2. **Real-time Validation Pattern**

```typescript
const useFormValidation = (schema: z.ZodSchema, initialData: any) => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: any) => {
    const fieldSchema = schema.shape[field];
    if (fieldSchema) {
      const result = fieldSchema.safeParse(value);
      if (!result.success) {
        setErrors(prev => ({
          ...prev,
          [field]: result.error.errors[0]?.message || 'Invalid value'
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  const handleChange = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));

    // Validate after user interaction
    if (touched[field]) {
      validateField(field, value);
    }
  };

  return { data, errors, touched, handleChange, validateField };
};
```

## Error Handling Patterns

### 1. **User-Friendly Error Messages**

```typescript
const getErrorMessage = (error: string, field: string): string => {
  const errorMap: Record<string, string> = {
    'String must contain at least 1 character(s)': `${field} is required`,
    'Number must be greater than 0': `${field} must be a positive amount`,
    'Invalid email': 'Please enter a valid email address',
    'teamId_unauthorized': 'You do not have permission to access this resource',
  };

  return errorMap[error] || error;
};
```

### 2. **Global Error Handling**

```typescript
const FormErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setErrorMessage(event.message);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">
          Something went wrong. Please refresh the page and try again.
        </p>
        <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
};
```

## Accessibility Patterns

### 1. **Form Accessibility Checklist**

```typescript
// ALWAYS implement these accessibility features:
const AccessibleForm = () => {
  return (
    <form>
      {/* 1. Proper labeling */}
      <label htmlFor="clientName" className="sr-only">
        Client Name (required)
      </label>
      <input
        id="clientName"
        aria-required="true"
        aria-describedby="clientName-error"
        // ... other props
      />

      {/* 2. Error association */}
      <div id="clientName-error" role="alert" aria-live="polite">
        {error && <span className="text-red-600">{error}</span>}
      </div>

      {/* 3. Submit button state */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="btn btn-primary"
      >
        {isSubmitting ? 'Saving...' : 'Save Contract'}
      </button>
    </form>
  );
};
```

### 2. **Keyboard Navigation**

```typescript
const useFormKeyboardNavigation = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Enter to submit (when not in textarea)
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      // Find submit button and click it
      const submitButton = document.querySelector('[type="submit"]');
      if (submitButton) {
        (submitButton as HTMLButtonElement).click();
      }
    }

    // Escape to cancel/close
    if (e.key === 'Escape') {
      // Handle form cancellation
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

## Performance Patterns

### 1. **Form Optimization**

```typescript
// Use React.memo for form components that don't change often
const MemoizedFormInput = React.memo(FormInput);

// Debounce validation for expensive operations
const useDebouncedValidation = (value: string, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

## Testing Patterns

### 1. **Form Testing Strategy**

```typescript
// Test precision bug prevention
describe('Number Input Precision', () => {
  it('should blur input on wheel event to prevent accidental changes', () => {
    render(<CurrencyInput value={1000} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('1000');

    // Simulate wheel event
    fireEvent.wheel(input);

    // Input should lose focus
    expect(input).not.toHaveFocus();
  });
});

// Test validation
describe('Form Validation', () => {
  it('should show error for invalid email', async () => {
    render(<ContactForm />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });
});
```

## Security Considerations

### 1. **Input Sanitization**

```typescript
const sanitizeInput = (value: string): string => {
  // Remove potentially dangerous characters
  return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const handleInputChange = (field: string, value: string) => {
  const sanitizedValue = sanitizeInput(value);
  setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
};
```

### 2. **Team Context Validation**

```typescript
// ALWAYS validate team access in forms
const validateTeamAccess = (data: FormData, userTeamId: string): boolean => {
  return data.teamId === userTeamId;
};

const handleSubmit = async (data: FormData) => {
  if (!validateTeamAccess(data, user.teamId)) {
    throw new Error('Unauthorized access attempt');
  }
  // Proceed with submission
};
```

## Common Form Types in ArqCashflow

### 1. **Contract Form Pattern**
- Client information + project details
- Financial amounts (use precision bug prevention)
- Date handling with proper formatting
- Team security validation

### 2. **Expense Form Pattern**
- Vendor/supplier information
- Category selection with validation
- Receipt upload handling
- Recurring expense configuration

### 3. **Receivable Form Pattern**
- Payment tracking
- Due date management
- Status updates with history
- Integration with contract data

## Related Documentation

- [Precision Bug Investigation](../../decisions/001-precision-bug-investigation.md) - Background on scroll wheel issue
- [Design Principles](../../design/principles.md) - Form design guidelines
- [Architecture Overview](../../developer/architecture/overview.md) - System integration patterns

---

*This context ensures all forms in ArqCashflow are secure, accessible, and free from precision-related bugs that could corrupt financial data.*