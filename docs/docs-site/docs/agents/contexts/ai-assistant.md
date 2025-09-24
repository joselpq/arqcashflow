---
title: "AI Assistant Development Context"
type: "context"
audience: ["agent"]
contexts: ["ai", "claude", "document-processing", "natural-language"]
complexity: "advanced"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["ai-developer", "integration-engineer", "document-processor"]
related:
  - developer/architecture/overview.md
  - decisions/002-claude-migration.md
  - reference/api/ai-assistant.md
dependencies: ["anthropic-sdk", "langchain", "claude-api"]
---

# AI Assistant Development Context

## Context for LLM Agents

**Scope**: Comprehensive context for developing and integrating AI features in ArqCashflow using Claude API
**Prerequisites**: Understanding of Claude API, document processing, RAG patterns, and financial data handling
**Key Patterns**:
- Claude API integration with team-based security
- Document processing and text extraction pipelines
- Natural language query processing for financial data
- Context-aware response generation
- Token optimization strategies

## AI Architecture Overview

### Core Components

```
AI Assistant System:
├── Document Processing Pipeline
│   ├── PDF/Image OCR extraction
│   ├── Text preprocessing and cleaning
│   └── Financial entity recognition
├── Query Processing Engine
│   ├── Intent classification
│   ├── Entity extraction (contracts, amounts, dates)
│   └── Context retrieval from database
├── Response Generation
│   ├── Claude API integration
│   ├── Template-based responses
│   └── Context-aware formatting
└── Security Layer
    ├── Team-based data isolation
    ├── Sensitive data filtering
    └── Permission validation
```

## Claude API Integration Patterns

### 1. **Base Claude Client Setup**

```typescript
import { Anthropic } from '@anthropic-ai/sdk';

class ClaudeService {
  private client: Anthropic;

  constructor() {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
  }

  async processQuery(
    prompt: string,
    context: string,
    teamId: string
  ): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        system: this.buildSystemPrompt(teamId),
        messages: [
          {
            role: 'user',
            content: this.buildUserPrompt(prompt, context),
          },
        ],
      });

      return this.extractResponseText(message);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new AIAssistantError('Failed to process query');
    }
  }

  private buildSystemPrompt(teamId: string): string {
    return `You are an AI assistant for ArqCashflow, a financial management system for architects.

CRITICAL RULES:
- You can only access data for team ID: ${teamId}
- Never reveal information from other teams
- Focus on financial management, contracts, receivables, and expenses
- Provide specific, actionable advice for architectural businesses
- Format monetary values in Brazilian Real (R$) format
- Use DD/MM/YYYY date format

CAPABILITIES:
- Analyze financial documents and contracts
- Calculate cash flow projections
- Identify overdue payments and upcoming receivables
- Suggest expense categorization
- Provide business insights and recommendations`;
  }
}
```

### 2. **Document Processing Pipeline**

```typescript
interface DocumentProcessor {
  extractText(file: File): Promise<string>;
  processFinancialDocument(text: string, teamId: string): Promise<ProcessedDocument>;
}

class FinancialDocumentProcessor implements DocumentProcessor {
  async extractText(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('document', file);

    // Use OCR service or PDF parsing
    const response = await fetch('/api/document/extract', {
      method: 'POST',
      body: formData,
    });

    const { text } = await response.json();
    return text;
  }

  async processFinancialDocument(
    text: string,
    teamId: string
  ): Promise<ProcessedDocument> {
    const prompt = `Extract financial information from this document:

${text}

Return a JSON object with:
- documentType: "contract" | "invoice" | "receipt" | "bank_statement"
- entities: array of financial entities found
- amounts: array of monetary values with descriptions
- dates: array of important dates
- parties: client/vendor information
- summary: brief description of the document

Ensure all amounts are in Brazilian Real format and dates are DD/MM/YYYY.`;

    const response = await this.client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2048,
      system: `You are a financial document processor. Extract structured data only for team ${teamId}.`,
      messages: [{ role: 'user', content: prompt }],
    });

    return JSON.parse(this.extractResponseText(response));
  }
}
```

## Query Processing Patterns

### 1. **Intent Classification**

```typescript
enum QueryIntent {
  CASH_FLOW_ANALYSIS = 'cash_flow_analysis',
  OVERDUE_PAYMENTS = 'overdue_payments',
  EXPENSE_CATEGORIZATION = 'expense_categorization',
  DOCUMENT_ANALYSIS = 'document_analysis',
  FINANCIAL_SUMMARY = 'financial_summary',
  GENERAL_QUESTION = 'general_question',
}

class IntentClassifier {
  async classifyIntent(query: string): Promise<QueryIntent> {
    const prompt = `Classify this financial query into one of these categories:
- cash_flow_analysis: Questions about cash flow, revenue, projections
- overdue_payments: Questions about late payments, receivables
- expense_categorization: Questions about organizing or categorizing expenses
- document_analysis: Requests to analyze uploaded documents
- financial_summary: Requests for reports or summaries
- general_question: Other questions about financial management

Query: "${query}"

Return only the category name.`;

    const response = await this.client.messages.create({
      model: 'claude-3-haiku-20240307', // Faster model for classification
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    const intent = this.extractResponseText(response).trim();
    return intent as QueryIntent;
  }
}
```

### 2. **Context Retrieval System**

```typescript
class ContextRetriever {
  async getRelevantContext(
    query: string,
    intent: QueryIntent,
    teamId: string
  ): Promise<FinancialContext> {
    const context: FinancialContext = {
      contracts: [],
      receivables: [],
      expenses: [],
      summary: {},
    };

    switch (intent) {
      case QueryIntent.CASH_FLOW_ANALYSIS:
        context.contracts = await this.getActiveContracts(teamId);
        context.receivables = await this.getUpcomingReceivables(teamId);
        context.summary = await this.getFinancialSummary(teamId);
        break;

      case QueryIntent.OVERDUE_PAYMENTS:
        context.receivables = await this.getOverdueReceivables(teamId);
        break;

      case QueryIntent.EXPENSE_CATEGORIZATION:
        context.expenses = await this.getRecentExpenses(teamId);
        break;

      default:
        // Get general financial overview
        context.summary = await this.getFinancialSummary(teamId);
    }

    return context;
  }

  private async getActiveContracts(teamId: string): Promise<Contract[]> {
    return prisma.contract.findMany({
      where: {
        teamId,
        status: 'active',
      },
      select: {
        id: true,
        clientName: true,
        projectName: true,
        totalValue: true,
        signedDate: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Limit for token efficiency
    });
  }
}
```

## Response Generation Patterns

### 1. **Template-Based Responses**

```typescript
class ResponseGenerator {
  private templates = {
    [QueryIntent.CASH_FLOW_ANALYSIS]: `Based on your financial data:

**Current Status:**
{summary}

**Active Contracts:** {contractCount} contracts totaling {contractValue}
**Pending Receivables:** {receivableCount} payments worth {receivableValue}
**Monthly Expenses:** {monthlyExpenses}

**Cash Flow Insights:**
{insights}

**Recommendations:**
{recommendations}`,

    [QueryIntent.OVERDUE_PAYMENTS]: `**Overdue Payments Analysis**

You have {overdueCount} overdue payments totaling {overdueValue}:

{overdueList}

**Priority Actions:**
{actions}

**Follow-up Strategy:**
{strategy}`,
  };

  async generateResponse(
    query: string,
    intent: QueryIntent,
    context: FinancialContext,
    teamId: string
  ): Promise<string> {
    const template = this.templates[intent];
    if (!template) {
      return this.generateGenericResponse(query, context, teamId);
    }

    const prompt = `Using this financial context for team ${teamId}:

${JSON.stringify(context, null, 2)}

User question: "${query}"

Generate a response using this template structure:
${template}

Fill in the template with specific data from the context. Be precise with numbers, dates, and recommendations. Format amounts in R$ and dates as DD/MM/YYYY.`;

    const response = await this.client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      system: 'You are a financial advisor for architects. Be specific, actionable, and professional.',
      messages: [{ role: 'user', content: prompt }],
    });

    return this.extractResponseText(response);
  }
}
```

### 2. **Smart Context Summarization**

```typescript
class ContextSummarizer {
  async summarizeForPrompt(
    context: FinancialContext,
    maxTokens: number = 1000
  ): Promise<string> {
    // Estimate tokens (rough: 1 token ≈ 4 characters)
    const fullContext = JSON.stringify(context);
    const estimatedTokens = fullContext.length / 4;

    if (estimatedTokens <= maxTokens) {
      return fullContext;
    }

    // Prioritize recent and high-value items
    const summarized = {
      summary: context.summary,
      recentContracts: context.contracts.slice(0, 5),
      overdueReceivables: context.receivables.filter(r => r.isOverdue),
      topExpenses: context.expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10),
    };

    return JSON.stringify(summarized);
  }
}
```

## Security and Privacy Patterns

### 1. **Team Data Isolation**

```typescript
class SecureAIService {
  async processQuery(
    query: string,
    teamId: string,
    userId: string
  ): Promise<string> {
    // Validate user has access to team
    await this.validateTeamAccess(userId, teamId);

    // Filter sensitive information from query
    const sanitizedQuery = this.sanitizeQuery(query);

    // Get context with team isolation
    const context = await this.getSecureContext(sanitizedQuery, teamId);

    // Process with team-scoped prompt
    return this.generateSecureResponse(sanitizedQuery, context, teamId);
  }

  private async validateTeamAccess(userId: string, teamId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, teamId },
    });

    if (!user) {
      throw new Error('Unauthorized: User does not have access to this team');
    }
  }

  private sanitizeQuery(query: string): string {
    // Remove potential sensitive patterns
    return query
      .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD-REMOVED]') // Credit cards
      .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF-REMOVED]') // CPF
      .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[CNPJ-REMOVED]'); // CNPJ
  }
}
```

### 2. **Response Filtering**

```typescript
class ResponseFilter {
  filterSensitiveContent(response: string, teamId: string): string {
    // Remove any accidentally leaked team IDs from other teams
    const teamPattern = new RegExp(`team[_-]?(?!${teamId})[a-f0-9-]{8,}`, 'gi');

    return response
      .replace(teamPattern, '[TEAM-ID-FILTERED]')
      .replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi,
               (match) => match.startsWith(teamId) ? match : '[ID-FILTERED]');
  }
}
```

## Performance Optimization

### 1. **Token Usage Optimization**

```typescript
class TokenOptimizer {
  optimizePrompt(prompt: string, maxTokens: number): string {
    const tokens = this.estimateTokens(prompt);

    if (tokens <= maxTokens) {
      return prompt;
    }

    // Progressive reduction strategies
    return this.applyReductionStrategies(prompt, maxTokens);
  }

  private applyReductionStrategies(prompt: string, maxTokens: number): string {
    // 1. Remove redundant whitespace
    let optimized = prompt.replace(/\s+/g, ' ').trim();

    // 2. Abbreviate common terms
    const abbreviations = {
      'contract': 'ctr',
      'receivable': 'rcv',
      'expense': 'exp',
      'Brazilian Real': 'R$',
    };

    Object.entries(abbreviations).forEach(([full, abbrev]) => {
      optimized = optimized.replace(new RegExp(full, 'gi'), abbrev);
    });

    // 3. Truncate examples if still too long
    if (this.estimateTokens(optimized) > maxTokens) {
      optimized = optimized.substring(0, maxTokens * 4); // Rough conversion
    }

    return optimized;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimate
  }
}
```

### 2. **Caching Strategy**

```typescript
class AIResponseCache {
  private cache = new Map<string, CachedResponse>();

  async getCachedResponse(
    query: string,
    context: FinancialContext,
    teamId: string
  ): Promise<string | null> {
    const cacheKey = this.generateCacheKey(query, context, teamId);
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isExpired(cached)) {
      return cached.response;
    }

    return null;
  }

  setCachedResponse(
    query: string,
    context: FinancialContext,
    teamId: string,
    response: string
  ): void {
    const cacheKey = this.generateCacheKey(query, context, teamId);
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      expiresIn: 5 * 60 * 1000, // 5 minutes for financial data
    });
  }

  private generateCacheKey(
    query: string,
    context: FinancialContext,
    teamId: string
  ): string {
    const contextHash = this.hashObject({
      summary: context.summary,
      contractCount: context.contracts.length,
      receivableCount: context.receivables.length,
    });

    return `${teamId}:${this.hashString(query)}:${contextHash}`;
  }
}
```

## Error Handling and Monitoring

### 1. **Comprehensive Error Handling**

```typescript
class AIErrorHandler {
  async handleAIError(error: Error, context: ErrorContext): Promise<string> {
    // Log error for monitoring
    console.error('AI Assistant Error:', {
      error: error.message,
      stack: error.stack,
      teamId: context.teamId,
      query: context.query,
      timestamp: new Date().toISOString(),
    });

    // Return user-friendly response
    if (error instanceof ClaudeAPIError) {
      return this.handleClaudeAPIError(error);
    }

    if (error instanceof ValidationError) {
      return "I couldn't process your request due to invalid data. Please try rephrasing your question.";
    }

    return "I'm experiencing technical difficulties. Please try again in a few moments.";
  }

  private handleClaudeAPIError(error: ClaudeAPIError): string {
    switch (error.status) {
      case 429:
        return "I'm currently handling many requests. Please try again in a moment.";
      case 400:
        return "I couldn't understand your request. Could you please rephrase it?";
      default:
        return "I'm temporarily unavailable. Please try again later.";
    }
  }
}
```

## Testing Patterns

### 1. **AI Response Testing**

```typescript
describe('AI Assistant', () => {
  it('should provide accurate cash flow analysis', async () => {
    const mockContext = {
      summary: { totalRevenue: 50000, totalExpenses: 30000 },
      contracts: [{ totalValue: 25000, status: 'active' }],
      receivables: [{ amount: 15000, dueDate: '2025-01-15' }],
    };

    const response = await aiService.processQuery(
      'How is my cash flow looking?',
      'test-team-id'
    );

    expect(response).toContain('R$ 50.000');
    expect(response).toContain('positive cash flow');
    expect(response).toMatch(/recommendation|suggestion/i);
  });

  it('should filter team-specific data', async () => {
    const response = await aiService.processQuery(
      'Show me all contracts',
      'team-123'
    );

    // Should not contain data from other teams
    expect(response).not.toContain('team-456');
    expect(response).not.toContain('team-789');
  });
});
```

## Integration with ArqCashflow Components

### 1. **API Route Integration**

```typescript
// app/api/ai-assistant/route.ts
export async function POST(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth();
    const { query } = await request.json();

    const aiService = new AIAssistantService();
    const response = await aiService.processQuery(query, teamId, user.id);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('AI Assistant API error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI query' },
      { status: 500 }
    );
  }
}
```

### 2. **React Component Integration**

```typescript
const AIAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      setResponse('Sorry, I encountered an error processing your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant">
      <form onSubmit={handleSubmit}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask me about your finances..."
          className="w-full p-3 border rounded-md"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn btn-primary mt-2"
        >
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>
      </form>

      {response && (
        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <div className="whitespace-pre-wrap">{response}</div>
        </div>
      )}
    </div>
  );
};
```

## Related Documentation

- [Claude Migration Decision](../../decisions/002-claude-migration.md) - Why we chose Claude over OpenAI
- [API Reference](../../reference/api/ai-assistant.md) - AI Assistant endpoints
- [Architecture Overview](../../developer/architecture/overview.md) - System integration patterns

---

*This context ensures AI features in ArqCashflow are secure, performant, and provide valuable insights while maintaining strict team data isolation.*