---
title: "Error Handling Patterns"
type: "pattern"
audience: ["agent"]
contexts: ["error-handling", "exceptions", "validation", "user-experience", "debugging"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["backend-developer", "frontend-developer", "error-handler"]
related:
  - agents/contexts/debugging-approach.md
  - agents/contexts/api-development.md
  - developer/architecture/overview.md
dependencies: ["react", "next.js", "zod"]
---

# Error Handling Patterns

## Context for LLM Agents

**Scope**: Comprehensive error handling strategies for ArqCashflow covering validation, API errors, user feedback, and system resilience
**Prerequisites**: Understanding of JavaScript error types, React error boundaries, Next.js error handling, and user experience principles
**Key Patterns**:
- User-friendly error messages with clear actions
- Graceful degradation for system failures
- Comprehensive logging for debugging
- Type-safe error handling with custom error classes
- Progressive error recovery strategies

## Error Classification System

ArqCashflow uses a structured approach to error classification for consistent handling across the application.

### 1. **Error Categories**

```typescript
// lib/errors/types.ts
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_API = 'external_api',
  DATABASE = 'database',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  NETWORK = 'network',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  teamId?: string;
  endpoint?: string;
  userAgent?: string;
  timestamp: Date;
  sessionId?: string;
  additionalData?: Record<string, any>;
}
```

### 2. **Custom Error Classes**

```typescript
// lib/errors/base.ts
export abstract class BaseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    statusCode: number,
    code: string,
    userMessage: string,
    context: Partial<ErrorContext> = {},
    isOperational: boolean = true
  ) {
    super(message);

    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.code = code;
    this.userMessage = userMessage;
    this.isOperational = isOperational;
    this.context = {
      timestamp: new Date(),
      ...context,
    };

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }
}
```

### 3. **Specific Error Classes**

```typescript
// lib/errors/validation.ts
export class ValidationError extends BaseError {
  public readonly field?: string;
  public readonly validationErrors: ValidationIssue[];

  constructor(
    message: string,
    field?: string,
    validationErrors: ValidationIssue[] = [],
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      400,
      'VALIDATION_ERROR',
      'Por favor, verifique os dados informados e tente novamente.',
      context
    );

    this.field = field;
    this.validationErrors = validationErrors;
  }

  static fromZodError(zodError: ZodError, context: Partial<ErrorContext> = {}): ValidationError {
    const validationErrors: ValidationIssue[] = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return new ValidationError(
      'Validation failed',
      undefined,
      validationErrors,
      context
    );
  }
}

// lib/errors/business.ts
export class BusinessLogicError extends BaseError {
  constructor(
    message: string,
    userMessage: string,
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.CONFLICT,
      ErrorSeverity.MEDIUM,
      409,
      'BUSINESS_LOGIC_ERROR',
      userMessage,
      context
    );
  }
}

// lib/errors/authentication.ts
export class AuthenticationError extends BaseError {
  constructor(
    message: string = 'Authentication required',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      401,
      'AUTHENTICATION_ERROR',
      'Você precisa estar logado para acessar esta funcionalidade.',
      context
    );
  }
}

export class AuthorizationError extends BaseError {
  constructor(
    message: string = 'Access denied',
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      403,
      'AUTHORIZATION_ERROR',
      'Você não tem permissão para realizar esta ação.',
      context
    );
  }
}

// lib/errors/system.ts
export class SystemError extends BaseError {
  constructor(
    message: string,
    originalError?: Error,
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
      500,
      'SYSTEM_ERROR',
      'Ocorreu um erro interno. Nossa equipe foi notificada e está trabalhando para resolver.',
      context,
      false // System errors are not operational
    );

    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}
```

## Frontend Error Handling Patterns

### 1. **Error Boundary Component**

```typescript
// lib/components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report to error monitoring service
    ErrorReporter.reportError(error, {
      context: 'react_error_boundary',
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-12 w-12 text-red-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Ops! Algo deu errado
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Encontramos um problema inesperado. Nossa equipe foi notificada
                  e está trabalhando para resolver.
                </p>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Recarregar Página
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Voltar
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Detalhes técnicos (desenvolvimento)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2. **Hook for Error Handling**

```typescript
// lib/hooks/useErrorHandler.ts
export function useErrorHandler() {
  const [error, setError] = useState<BaseError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: unknown) => {
    console.error('Error caught by useErrorHandler:', error);

    let processedError: BaseError;

    if (error instanceof BaseError) {
      processedError = error;
    } else if (error instanceof Error) {
      processedError = new SystemError(
        `Unexpected error: ${error.message}`,
        error
      );
    } else {
      processedError = new SystemError(
        `Unknown error: ${String(error)}`
      );
    }

    setError(processedError);

    // Report error for monitoring
    ErrorReporter.reportError(processedError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await operation();
        setIsLoading(false);
        return result;
      } catch (error) {
        handleError(error);
        setIsLoading(false);
        return null;
      }
    },
    [handleError]
  );

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling,
  };
}

// Usage example
const ContractForm = () => {
  const { error, isLoading, executeWithErrorHandling, clearError } = useErrorHandler();

  const handleSubmit = async (formData: ContractFormData) => {
    const result = await executeWithErrorHandling(async () => {
      return await createContract(formData);
    });

    if (result) {
      // Success handling
      router.push('/contracts');
    }
  };

  return (
    <div>
      {error && (
        <ErrorAlert
          error={error}
          onDismiss={clearError}
        />
      )}
      {/* Form content */}
    </div>
  );
};
```

### 3. **Error Alert Components**

```typescript
// lib/components/ui/ErrorAlert.tsx
interface ErrorAlertProps {
  error: BaseError;
  onDismiss?: () => void;
  showDetails?: boolean;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onDismiss,
  showDetails = false,
}) => {
  const getAlertStyle = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'bg-red-50 border-red-200 text-red-800';
      case ErrorSeverity.MEDIUM:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case ErrorSeverity.LOW:
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      case ErrorSeverity.MEDIUM:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case ErrorSeverity.LOW:
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className={`rounded-md p-4 border ${getAlertStyle()}`}>
      <div className="flex">
        <div className="flex-shrink-0">{getIcon()}</div>

        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {error.category === ErrorCategory.VALIDATION
              ? 'Erro de Validação'
              : error.category === ErrorCategory.AUTHENTICATION
              ? 'Erro de Autenticação'
              : error.category === ErrorCategory.AUTHORIZATION
              ? 'Erro de Autorização'
              : 'Erro do Sistema'}
          </h3>

          <div className="mt-2 text-sm">
            <p>{error.userMessage}</p>

            {error instanceof ValidationError && error.validationErrors.length > 0 && (
              <ul className="mt-2 list-disc list-inside">
                {error.validationErrors.map((validationError, index) => (
                  <li key={index}>
                    {validationError.field && (
                      <strong>{validationError.field}:</strong>
                    )}{' '}
                    {validationError.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {showDetails && process.env.NODE_ENV === 'development' && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs">
                Detalhes técnicos
              </summary>
              <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto">
                {JSON.stringify(error.toJSON(), null, 2)}
              </pre>
            </details>
          )}
        </div>

        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

## API Error Handling Patterns

### 1. **Centralized API Error Handler**

```typescript
// lib/api/error-handler.ts
export class APIErrorHandler {
  static handleAPIError(error: unknown, context: Partial<ErrorContext> = {}): never {
    console.error('API Error:', error);

    // Add request context
    const enhancedContext = {
      ...context,
      timestamp: new Date(),
    };

    if (error instanceof BaseError) {
      // Re-throw custom errors as-is
      throw error;
    }

    if (error instanceof ZodError) {
      throw ValidationError.fromZodError(error, enhancedContext);
    }

    if (error instanceof PrismaClientKnownRequestError) {
      throw this.handlePrismaError(error, enhancedContext);
    }

    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('ECONNREFUSED')) {
        throw new SystemError(
          'Database connection failed',
          error,
          enhancedContext
        );
      }

      if (error.message.includes('timeout')) {
        throw new SystemError(
          'Request timeout',
          error,
          enhancedContext
        );
      }

      // Generic error fallback
      throw new SystemError(
        `Unexpected error: ${error.message}`,
        error,
        enhancedContext
      );
    }

    // Unknown error type
    throw new SystemError(
      `Unknown error: ${String(error)}`,
      undefined,
      enhancedContext
    );
  }

  private static handlePrismaError(
    error: PrismaClientKnownRequestError,
    context: Partial<ErrorContext>
  ): BaseError {
    switch (error.code) {
      case 'P2002':
        return new BusinessLogicError(
          'Unique constraint violation',
          'Este registro já existe no sistema.',
          context
        );

      case 'P2025':
        return new NotFoundError('Record not found', context);

      case 'P2003':
        return new BusinessLogicError(
          'Foreign key constraint violation',
          'Este item não pode ser removido pois está sendo usado em outros registros.',
          context
        );

      default:
        return new SystemError(
          `Database error: ${error.message}`,
          error,
          context
        );
    }
  }
}
```

### 2. **API Route Error Wrapper**

```typescript
// lib/api/with-error-handling.ts
export function withErrorHandling<T>(
  handler: (request: NextRequest, context?: any) => Promise<T>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      const result = await handler(request, context);
      return NextResponse.json(result);
    } catch (error) {
      return this.formatErrorResponse(error, request);
    }
  };
}

export function formatErrorResponse(
  error: unknown,
  request: NextRequest
): NextResponse {
  let processedError: BaseError;

  try {
    APIErrorHandler.handleAPIError(error, {
      endpoint: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent') || undefined,
    });
  } catch (handledError) {
    processedError = handledError as BaseError;
  }

  // Log error for monitoring
  if (processedError.severity === ErrorSeverity.CRITICAL) {
    console.error('Critical API Error:', processedError.toJSON());
  }

  // Format response
  const errorResponse = {
    error: {
      message: processedError.userMessage,
      code: processedError.code,
      category: processedError.category,
      ...(processedError instanceof ValidationError && {
        validation: processedError.validationErrors,
      }),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(errorResponse, {
    status: processedError.statusCode,
  });
}

// Usage in API routes
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = ContractCreateSchema.parse(body);

  const contract = await ContractService.create(validatedData, teamId);
  return contract;
});
```

## Client-Side Error Handling

### 1. **API Client with Error Handling**

```typescript
// lib/api/client.ts
export class APIClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        await this.handleHTTPError(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new SystemError(
          'Network error',
          error as Error,
          { endpoint }
        );
      }

      throw new SystemError(
        `Request failed: ${error}`,
        error instanceof Error ? error : undefined,
        { endpoint }
      );
    }
  }

  private async handleHTTPError(response: Response): Promise<never> {
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const context = {
      endpoint: response.url,
      statusCode: response.status,
    };

    switch (response.status) {
      case 400:
        if (errorData.error?.category === 'validation') {
          throw new ValidationError(
            errorData.error.message,
            undefined,
            errorData.error.validation || [],
            context
          );
        }
        throw new BusinessLogicError(
          errorData.error?.message || 'Bad request',
          errorData.error?.message || 'Requisição inválida.',
          context
        );

      case 401:
        throw new AuthenticationError(
          errorData.error?.message || 'Unauthorized',
          context
        );

      case 403:
        throw new AuthorizationError(
          errorData.error?.message || 'Forbidden',
          context
        );

      case 404:
        throw new NotFoundError(
          errorData.error?.message || 'Not found',
          context
        );

      case 429:
        throw new SystemError(
          'Rate limit exceeded',
          undefined,
          context
        );

      case 500:
      default:
        throw new SystemError(
          errorData.error?.message || 'Internal server error',
          undefined,
          context
        );
    }
  }

  // Convenience methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Global API client instance
export const apiClient = new APIClient();
```

## Error Recovery Strategies

### 1. **Retry Logic**

```typescript
// lib/utils/retry.ts
interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff: boolean;
  retryCondition?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    retryCondition = (error) => {
      // Default: retry on network errors and 5xx responses
      if (error instanceof SystemError) {
        return error.statusCode >= 500;
      }
      return false;
    },
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or if condition doesn't match
      if (attempt === maxAttempts || !retryCondition(error)) {
        throw error;
      }

      // Calculate delay
      const delay = exponentialBackoff
        ? delayMs * Math.pow(2, attempt - 1)
        : delayMs;

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const createContractWithRetry = async (data: ContractData) => {
  return withRetry(
    () => apiClient.post('/contracts', data),
    {
      maxAttempts: 3,
      delayMs: 1000,
      exponentialBackoff: true,
    }
  );
};
```

### 2. **Circuit Breaker Pattern**

```typescript
// lib/utils/circuit-breaker.ts
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeoutMs: number = 60000, // 1 minute
    private monitoringPeriodMs: number = 120000 // 2 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new SystemError('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;

    return (
      Date.now() - this.lastFailureTime.getTime() > this.recoveryTimeoutMs
    );
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Usage for external API calls
const claudeAPICircuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30s recovery

export const processWithClaudeAPI = async (query: string) => {
  return claudeAPICircuitBreaker.execute(async () => {
    return await claudeAPI.processQuery(query);
  });
};
```

## Error Monitoring and Reporting

### 1. **Error Reporter Service**

```typescript
// lib/monitoring/error-reporter.ts
export class ErrorReporter {
  private static instance: ErrorReporter;
  private errorQueue: Array<ErrorReport> = [];
  private batchTimeout?: NodeJS.Timeout;

  static getInstance(): ErrorReporter {
    if (!this.instance) {
      this.instance = new ErrorReporter();
    }
    return this.instance;
  }

  static reportError(
    error: Error | BaseError,
    context: Partial<ErrorContext> = {}
  ): void {
    this.getInstance().reportError(error, context);
  }

  reportError(
    error: Error | BaseError,
    context: Partial<ErrorContext> = {}
  ): void {
    const report: ErrorReport = {
      id: generateId(),
      timestamp: new Date(),
      error: error instanceof BaseError ? error.toJSON() : {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        userId: getCurrentUserId(),
        teamId: getCurrentTeamId(),
        sessionId: getSessionId(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context,
      },
      environment: process.env.NODE_ENV || 'unknown',
    };

    // Add to queue for batch processing
    this.errorQueue.push(report);

    // Process immediately for critical errors
    if (error instanceof BaseError && error.severity === ErrorSeverity.CRITICAL) {
      this.flush();
    } else {
      // Batch non-critical errors
      this.scheduleBatch();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', report);
    }
  }

  private scheduleBatch(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.flush();
    }, 5000); // Batch every 5 seconds
  }

  private async flush(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const reports = [...this.errorQueue];
    this.errorQueue = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }

    try {
      // Send to monitoring service
      await this.sendToMonitoringService(reports);
    } catch (error) {
      console.error('Failed to send error reports:', error);

      // Re-queue if send failed
      this.errorQueue.unshift(...reports);
    }
  }

  private async sendToMonitoringService(reports: ErrorReport[]): Promise<void> {
    // In a real application, this would send to a service like Sentry, LogRocket, etc.
    await fetch('/api/monitoring/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reports }),
    });
  }
}

// Initialize global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    ErrorReporter.reportError(event.error, {
      context: 'window_error',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    ErrorReporter.reportError(new Error(event.reason), {
      context: 'unhandled_promise_rejection',
    });
  });
}
```

## Testing Error Handling

### 1. **Error Testing Patterns**

```typescript
// tests/error-handling.test.ts
describe('Error Handling', () => {
  describe('ValidationError', () => {
    it('should create validation error from Zod error', () => {
      const zodError = new ZodError([
        {
          path: ['email'],
          message: 'Invalid email',
          code: 'invalid_string',
        },
      ]);

      const validationError = ValidationError.fromZodError(zodError);

      expect(validationError.category).toBe(ErrorCategory.VALIDATION);
      expect(validationError.validationErrors).toHaveLength(1);
      expect(validationError.validationErrors[0].field).toBe('email');
    });
  });

  describe('APIClient', () => {
    it('should handle 404 errors correctly', async () => {
      fetchMock.mockResponseOnce('', { status: 404 });

      await expect(apiClient.get('/nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should handle validation errors correctly', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          error: {
            category: 'validation',
            validation: [{ field: 'email', message: 'Invalid email' }],
          },
        }),
        { status: 400 }
      );

      await expect(apiClient.post('/test', {})).rejects.toThrow(ValidationError);
    });
  });

  describe('Error Recovery', () => {
    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new SystemError('Temporary failure'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(mockOperation, {
        maxAttempts: 2,
        delayMs: 10,
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new ValidationError('Invalid input'));

      await expect(withRetry(mockOperation, { maxAttempts: 3 }))
        .rejects.toThrow(ValidationError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });
});
```

### 2. **Component Error Testing**

```typescript
// tests/components/ErrorBoundary.test.tsx
describe('ErrorBoundary', () => {
  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  it('should catch and display errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Recarregar Página')).toBeInTheDocument();
  });

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});

describe('useErrorHandler', () => {
  it('should handle errors correctly', async () => {
    const { result } = renderHook(() => useErrorHandler());

    const errorOperation = jest.fn().mockRejectedValue(new ValidationError('Test error'));

    await act(async () => {
      await result.current.executeWithErrorHandling(errorOperation);
    });

    expect(result.current.error).toBeInstanceOf(ValidationError);
    expect(result.current.error?.message).toBe('Test error');
  });
});
```

## Related Documentation

- [Debugging Approach Context](../agents/contexts/debugging-approach.md) - Systematic debugging methodology
- [API Development Context](../agents/contexts/api-development.md) - API error handling patterns
- [Architecture Overview](../developer/architecture/overview.md) - System design context

---

*These error handling patterns ensure ArqCashflow provides excellent user experience even when things go wrong, while maintaining system reliability and providing valuable debugging information.*