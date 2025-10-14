---
title: "AI Agent Strategy: Specialized Financial Intelligence Architecture"
type: "decision"
audience: ["developer", "agent", "product"]
contexts: ["ai-agents", "product-strategy", "financial-intelligence", "user-experience", "automation", "small-business", "professional-services", "document-processing", "business-insights", "global-chat", "context-aware-ui"]
complexity: "advanced"
last_updated: "2025-10-08"
version: "1.5"
agent_roles: ["ai-architect", "product-strategist", "business-analyst"]
related:
  - decisions/003-strategic-architecture-evolution.md
  - decisions/007-event-system-foundation.md
  - decisions/013-operations-agent-agentic-loop-refactor.md
  - agents/contexts/ai-assistant.md
dependencies: ["claude-api", "next.js", "service-layer", "event-system", "team-context", "financial-apis", "vercel-ai-sdk"]
---

# AI Agent Strategy: Specialized Financial Intelligence Architecture

## Context for LLM Agents

**Scope**: Comprehensive AI agent strategy for ArqCashflow, defining specialized agents for financial intelligence, document processing, and business insights
**Prerequisites**: Understanding of service layer architecture, event system, and financial business domain
**Key Patterns**:
- Specialized agents over generalist approaches
- Native multimodal capabilities (images, PDFs via Claude; Excel via preprocessing)
- Business context-aware reasoning
- API-driven integration with platform services
- Progressive disclosure of complexity

**Implementation Status (2025-10-04) - PHASE 2 COMPLETE**:
- ✅ **Phase 1A (Setup Assistant)**: 100% extraction accuracy achieved with sub-batch splitting
- ✅ **Phase 1B (Financial Query Agent)**: Complete - Text-to-SQL approach with Claude
  - Natural language to PostgreSQL query generation
  - Token efficient: ~4-5k tokens (vs 218k in initial approach)
  - Semantic mapping: projeto→contract, concluído→completed, etc.
  - Portuguese/English bilingual support
  - Conversation context management
  - UI integrated: Chat tab (💬 Chat Inteligente)
- ✅ **Phase 1C (Operations Agent)**: **COMPLETE** - Vercel AI SDK Migration (ADR-013)
  - **PRODUCTION READY** with framework-based implementation
  - Migrated from manual Anthropic SDK to Vercel AI SDK
  - Code reduction: 850 → 400 lines (-53%)
  - Multi-step tool calling with `stopWhen: stepCountIs(15)`
  - Automatic conversation state management via `CoreMessage[]`
  - CREATE/UPDATE/DELETE for all 4 entity types working correctly
  - Natural language commands: "50 gasolina ontem" → ✅ expense created
  - Context-rich system prompts with complete API documentation
  - Zero conversation state bugs (framework-managed)
  - UI integrated: Comandos tab (🎯 Comandos)
- ✅ **Phase 2 (Unified AI Router)**: Weeks 1, 2 & 3 COMPLETE
  - ✅ **Week 1-2 (Backend)**: Router infrastructure
    - AIAgentRouterService with intent classification (327 lines)
    - Unified conversation state types (187 lines)
    - Single entry point API route (/api/ai/unified, 150 lines)
    - Intent classification with Claude Sonnet 4 (setup/query/operations/general)
    - Operations Agent with Query Agent delegation
  - ✅ **Week 3 (Frontend)**: UI Integration
    - "🚀 AI Unificado" tab in /ai-chat (default active)
    - Conversation state persistence (fixes context loss bug)
    - Pending operation tracking with visual feedback
    - Agent indicator badges (color-coded by agent type)
    - Yellow banner for pending confirmations
    - Dynamic UI based on conversation state
    - Enhanced logging for debugging
  - ✅ Command Agent renamed to Operations Agent
  - ✅ Operations Agent enhanced with comprehensive database schema (83 lines)
  - ✅ Query Agent integration complete (165 lines delegation logic)
  - ✅ Test suite created (test-unified-ai-system.ts, 184 lines)
- 📊 Status: Phase 2 Week 1 & 2 complete, ready for Week 3 integration

## 🎯 **Strategic Overview (Updated 2025-09-30)**

**STRATEGIC PIVOT**: ArqCashflow's AI strategy has evolved from "build new specialized agents" to "incrementally upgrade existing proven systems" for faster time-to-value and lower risk.

**New Focus**: Preserve and enhance our working setup assistant (`/api/ai/setup-assistant-direct`) that successfully processes 100% of file types with sophisticated Brazilian business logic, while gaining modern architectural benefits through incremental improvement.

**Key Insight**: Users need reliable, working AI assistance more than perfect architecture. By upgrading incrementally, we deliver immediate value while building toward the same architectural goals.

### **Target User Profile**
- **Primary**: Individual professionals and small service firms (2-10 people)
- **Initial Focus**: Architecture firms as pilot market, expanding to consultants, designers, agencies
- **Pain Point**: Currently using spreadsheets for financial management
- **Goal**: Professional financial system with AI-powered insights
- **Success Metric**: "Wow, this is like having a CFO who never sleeps"

## 🧠 **Core AI Principles**

### **1. Leverage Native LLM Capabilities**
- **No redundant preprocessing**: If Claude can read images/documents natively, don't build OCR
- **Multimodal by default**: Agents should handle images, PDFs, spreadsheets directly
- **Natural reasoning**: Let models use their reasoning capabilities rather than over-constraining

### **2. Optimize for Experience, Not Cost**
- **Best models available**: Prioritize latest/best models (Claude 3.5 Sonnet, GPT-4, etc.)
- **Context maximization**: Use full context windows when beneficial
- **Quality over efficiency**: Better user experience over cost optimization

### **3. Specialization Over Generalization**
- **Purpose-built agents**: Each agent has specific expertise and tools
- **Deep business context**: Agents understand architecture firms' financial patterns
- **Focused tool sets**: Only relevant APIs and capabilities per agent

### **4. Context-Rich, Not Prescriptive**
- **Business context**: Full understanding of user's business model and goals
- **Flexible guidance**: Clear objectives with reasoning freedom
- **Self-correcting**: Agents should validate their own outputs

### **5. API-Native Integration**
- **Service layer integration**: Direct API access to platform services
- **Event-driven coordination**: Use event system for inter-agent communication
- **Team-aware**: All agents respect team isolation and security

## 🤖 **Agent Architecture**

### **Core Platform Agents (Phase 1)**

#### **1. Onboarding Intelligence Agent**
**"The Data Migration Specialist"**

**Purpose**: Transform spreadsheets and documents into structured financial data
**Wow Factor**: "Upload your mess → Perfect financial system in minutes"

**Capabilities**:
- **Multimodal intake**: Excel, Google Sheets, PDFs, images, CSVs
- **Financial pattern recognition**: Identify contracts, expenses, receivables
- **Data extraction and validation**: Extract amounts, dates, descriptions, categories
- **Interactive clarification**: Ask follow-up questions for ambiguous data
- **Bulk API registration**: Create contracts, expenses, receivables via APIs

**Tools Available**:
- Contract creation API (`/api/contracts`)
- Expense creation API (`/api/expenses`)
- Receivable creation API (`/api/receivables`)
- Team context and validation services
- File upload and processing capabilities

**Context Provided**:
- Professional service business models (projects, clients, phases, retainers)
- Platform data structure and requirements
- User's business type, scale, and industry
- Existing data patterns and validation rules

**Interaction Pattern**:
```
User: [Uploads 3 Excel files + 5 contract PDFs]
Agent: "I can see contracts with ACME Corp and Zeta Ltd, plus expense tracking
        for 2024. The Hotel expenses in March - are these project costs or
        administrative? Also, the R$45k payment to ACME - is this a milestone
        payment for the office renovation project?"
User: "Yes, hotel was for site visits. The R$45k was final payment."
Agent: [Creates 12 contracts, 145 expenses, 28 receivables]
       "Perfect! I've imported everything. You can see your 2024 profit was
        R$187k across 8 projects."
```

#### **2. Financial Query Agent** ✅ **IMPLEMENTED (2025-09-30)**
**"The Business Intelligence Expert"**

**Status**: **Production Ready** - Text-to-SQL implementation with Claude Sonnet 4
**Implementation**: `lib/services/FinancialQueryService.ts` + `/api/ai/query`
**UI**: Chat tab (💬 Chat Inteligente) at `/ai-chat`

**Purpose**: Answer financial questions using natural language with precise, concise responses
**Wow Factor**: "Ask anything about your business → Instant precise answers"

**Technical Architecture**:
- **Text-to-SQL Approach**: Claude generates PostgreSQL query → Execute → Format response
- **Token Efficiency**: ~4-5k tokens per query (vs 218k in initial broken approach)
- **Semantic Mapping**: projeto→contract, concluído→completed, cliente→clientName
- **Team Isolation**: Uses `teamScopedPrisma` + SQL WHERE clause filtering
- **Conversation Context**: Maintains history for follow-up questions

**Capabilities**:
- **Natural language queries**: "Quais meus projetos concluídos?"
- **Financial calculations**: Count contracts, sum receivables, calculate expenses
- **Smart inference**: Understands imprecise language and context
- **Clarification requests**: Asks follow-up questions when ambiguous
- **Bilingual**: Portuguese (primary) and English support

**Tools Available**:
- Direct PostgreSQL database access via Prisma
- Full access to Contract, Receivable, Expense tables
- Team-scoped data isolation
- Date/time functions for period calculations

**Context Provided**:
- Complete database schema with semantic hints
- Team ID for data isolation
- Current date for temporal queries
- Conversation history for context

**Interaction Pattern**:
```
User: "Quais meus projetos concluídos?"
Agent: "Você tem 8 contratos concluídos:
        - ACME Corp / Renovação Escritório: R$ 120.000,00
        - Beta Design / Casa Moderna: R$ 85.000,00
        - Zeta Ltda / Reforma Comercial: R$ 95.000,00
        [...]
        Total: R$ 687.000,00"

User: "E quanto recebi deles?"
Agent: "Dos 8 contratos concluídos, você recebeu R$ 652.000,00 (95%).
        Faltam R$ 35.000,00 de pagamentos finais pendentes."
```

**Implementation Notes**:
- Mirrors original LangChain approach but with Claude
- Does NOT extend BaseService (read-only, no CRUD)
- Uses ServiceContext pattern for team isolation
- Validates input with AISchemas.query from validation layer

#### **3. AI Operations Agent** ✅ **COMPLETE (2025-10-04) - Vercel AI SDK Implementation**
**"The Natural Language CRUD Expert"**

**Status**: ✅ **PRODUCTION READY**
**Implementation**: `lib/services/OperationsAgentService.ts` (400 lines) + `/api/ai/operations`
**Framework**: Vercel AI SDK v5 with Claude Sonnet 4
**Documentation**: ADR-013 v3.0 (complete implementation guide)
**Access**: Dedicated `/ai-chat` page + 🚧 **Global Chat Integration (In Progress)** - Floating chat accessible from all tabs

**Final Architecture (2025-10-04)**: **Framework-Based Multi-Step Tool Calling**
- **Previous approach**: 850 lines manual while-loop with Anthropic SDK
- **Final approach**: 400 lines using Vercel AI SDK `generateText()` (-53% reduction)
- **Key breakthrough**: `stopWhen: stepCountIs(15)` enables automatic agentic loop
- **Critical learning**: System prompts must include complete API documentation

**Purpose**: Execute CRUD operations through natural language commands
**Wow Factor**: "R$50 em gasolina ontem" → Expense created in 5 seconds

**The AI Trinity**:
1. ✅ **Setup Assistant** = Batch import (549 lines, working)
2. ✅ **Query Agent** = Read data (288 lines, working)
3. ✅ **Operations Agent** = CRUD operations (400 lines, Vercel AI SDK - COMPLETE)

**Current Architecture (Vercel AI SDK v5)**:
```typescript
import { generateText, tool, stepCountIs } from 'ai'

const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: detailedSystemPrompt,  // Complete API docs + database schema
  messages: [...history, { role: 'user', content: message }],
  tools: {
    query_database: tool({ inputSchema, execute }),
    call_service: tool({ inputSchema, execute })
  },
  stopWhen: stepCountIs(15)  // CRITICAL: Enable multi-step tool calling
})

// Framework handles:
// - Tool execution
// - State management (result.response.messages)
// - Agentic loop continuation
// - Type validation
```

**That's it. Framework handles state, we provide domain knowledge via system prompt.**

**Capabilities** (Claude handles ALL of this naturally):
- **CREATE**: All 4 entity types (contracts, receivables, expenses, recurring) - single or batch
- **UPDATE**: Partial or full updates - Claude queries DB to find entities
- **DELETE**: Single or batch deletion - Claude confirms with user first
- **QUERY**: Claude has direct database access via Query Agent patterns
- **Smart Inference** (Claude does this natively):
  - Date parsing: "ontem", "amanhã", "próxima semana" → ISO dates
  - Category inference: "gasolina" → transport, "almoço" → meals
  - Currency parsing: "R$50", "50 reais", "cinquenta" → 50.00
  - Entity matching: "Mari" finds "Residência Mariana" via SQL ILIKE/fuzzy
- **Ambiguity Resolution**: Claude asks follow-up questions when needed
- **Portuguese/English**: Claude is natively bilingual
- **Document Routing**: Claude routes file uploads to Setup Agent

**What Claude Gets** (in a single prompt):
- **Full conversation history**: All previous messages with context
- **Database schema**: Complete schema for all 4 entity types
- **API documentation**: All available service layer methods
- **Current context**: Date, team ID, user preferences
- **Available actions**:
  - Query database (read-only SQL via Query Agent pattern)
  - Call service APIs (create/update/delete via ContractService, etc.)
  - Ask clarifying questions
  - Route to Setup Agent for document processing

**Production Testing Results**:
```
Test: "50 gasolina ontem"
✅ Steps taken: 2 (tool call → final response)
✅ finishReason: 'stop' (natural completion)
✅ Expense created in database
✅ Confirmation: "✅ Despesa de R$50,00 criada com sucesso!"
```

**Key Implementation Details** (see ADR-013 for full guide):
- ✅ System prompt includes complete API documentation (required vs optional fields)
- ✅ Database schema provided for entity lookups
- ✅ Conversation history preserved automatically by framework
- ✅ Tool execution results passed back to Claude for Step 2
- ✅ Zero manual state management needed

**Example Interactions**:
```
User: "Quais meus 5 contratos de menor valor?"
Claude: [Queries DB] → "Aqui estão seus 5 contratos..."

User: "Deleta esses 5"
Claude: [Extracts IDs from conversation] → "Vou deletar 5 contratos: ... Confirma?"

User: "sim"
Claude: [Executes 5 DELETE calls] → "✅ 5 contratos deletados!"
```

```
User: "R$50 em gasolina ontem"
Claude: [Infers: date=yesterday, category=transport, amount=50]
        → "Vou criar despesa de R$50 em transporte. Confirma?"
User: "sim"
Claude: [POST /api/expenses] → "✅ Despesa criada!"
```

```
User: "Cria 3 recebíveis de R$1000 para próximos 3 meses do contrato ACME"
Claude: [Queries DB for ACME contract]
        [Prepares 3 receivables with monthly intervals]
        → "Vou criar 3 recebíveis:
           • R$1000 - 01/11/2025
           • R$1000 - 01/12/2025
           • R$1000 - 01/01/2026
           Vinculados ao contrato ACME. Confirma?"
User: "ok"
Claude: [POST /api/receivables × 3] → "✅ 3 recebíveis criados!"
```

**Implementation Status**: ✅ **COMPLETE (2025-10-04)**

**Final Metrics**:
- 📏 Code: 850 → 400 lines (-53%)
- 🐛 Bugs: Conversation state bug → Fixed (framework-managed)
- ⚡ Performance: 2+ steps per operation (multi-step tool calling working)
- ✅ Production: Tested and deployed

**Key Files** (production):
- `lib/services/OperationsAgentService.ts` (400 lines - Vercel AI SDK)
- `app/api/ai/operations/route.ts` (uses CoreMessage type)
- `docs/decisions/013-operations-agent-agentic-loop-refactor.md` (ADR-013 v3.0)

**Backup Files** (preserved for reference):
- `lib/services/OperationsAgentService-oldv2.ts` (manual while-loop version)
- `lib/services/OperationsAgentService-old.ts` (original Step 6)

---

## 🎯 **PHASE 2: UNIFIED AI ROUTER SYSTEM** (Planned 2025-10-01)

### **Strategic Rationale**

**Current State (Phase 1)**: Three specialized agents working independently
- ✅ Setup Assistant processes documents
- ✅ Query Agent answers questions
- 🔄 Operations Agent performs CRUD

**Problem**: No unified conversation context or intelligent routing
- Users must manually choose which agent to use
- No context sharing between agents
- Multi-turn conversations lose context
- Operations Agent can't delegate to Query Agent for lookups

**Solution**: Unified AI Router with shared conversation state

### **Architecture: The AI Trinity + Router**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER MESSAGE + FILES                      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              🎯 AI AGENT ROUTER (New!)                       │
│                                                              │
│  Responsibilities:                                           │
│  • Classify intent (Setup/Query/Operations/General)         │
│  • Manage unified conversation state                        │
│  • Route with full context to specialized agents            │
│  • Handle multi-turn conversations seamlessly               │
│                                                              │
│  Model: Claude Sonnet 4 (quality over cost)                 │
│  API: /api/ai/unified                                       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
              ┌────────────┴────────────┐
              ↓            ↓            ↓
    ┌─────────────┐ ┌─────────────┐ ┌──────────────┐
    │   📄 SETUP  │ │  📊 QUERY   │ │ ⚡ OPERATIONS │
    │   AGENT     │ │   AGENT     │ │    AGENT     │
    │             │ │             │ │              │
    │ Documents → │ │ Questions → │ │ CRUD ops →  │
    │ Batch CRUD  │ │ SQL + NL    │ │ Single ops  │
    └─────────────┘ └─────────────┘ └──────────────┘
         ↓               ↓                ↓
    ┌────────────────────────────────────────┐
    │      SERVICE LAYER + DATABASE          │
    │   (ContractService, ExpenseService...) │
    └────────────────────────────────────────┘
```

### **Core Components**

#### **1. AIAgentRouterService** (New)

**Location**: `lib/services/AIAgentRouterService.ts`

**Purpose**: Orchestrate all AI agents with unified conversation context

**Key Features**:
- Intent classification (fast, accurate)
- Unified conversation state management
- Context-aware routing to specialized agents
- Multi-turn conversation support
- Seamless agent transitions

**Interface**:
```typescript
export class AIAgentRouterService {
  constructor(context: ServiceContext)

  // Main entry point
  async processMessage(
    message: string,
    files: File[],
    conversationState: UnifiedConversationState
  ): Promise<AgentResponse>

  // Intent classification
  private async classifyIntent(
    message: string,
    hasFiles: boolean,
    conversationState: UnifiedConversationState
  ): Promise<AgentIntent>

  // Route to appropriate agent
  private async routeToAgent(
    intent: AgentIntent,
    message: string,
    files: File[],
    conversationState: UnifiedConversationState
  ): Promise<AgentResponse>
}
```

#### **2. Unified Conversation State**

**Purpose**: Single source of truth for all conversation context

```typescript
export interface UnifiedConversationState {
  // Shared across ALL agents
  messages: ConversationMessage[]

  // Entities created by any agent
  recentlyCreated: RecentEntity[]

  // Current pending operation (if any)
  pendingOperation?: {
    agentType: 'setup' | 'query' | 'operations'
    operation: any
    requiresConfirmation: boolean
  }

  // Last agent used (for context continuity)
  lastAgent?: 'setup' | 'query' | 'operations'

  // Conversation metadata
  metadata: {
    startedAt: Date
    lastUpdatedAt: Date
    messageCount: number
    entitiesCreated: number
  }
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  agentUsed?: 'setup' | 'query' | 'operations' | 'router'
  metadata?: {
    intent?: string
    entityType?: string
    entityId?: string
    filesProcessed?: number
  }
}
```

#### **3. Intent Classification**

**Model**: Claude Sonnet 4 (best quality, worth the cost)
**Approach**: Context-rich, not prescriptive (ADR-008 principle)

**Prompt Strategy**:
```typescript
`You are an AI assistant router for ArqCashflow.

# CONTEXT
- User has ${hasFiles ? 'uploaded files' : 'NO files'}
- Last agent used: ${lastAgent || 'none'}
- Recent conversation: [last 5 messages]

# USER MESSAGE
"${message}"

# TASK
Classify intent into ONE category:

1. **setup** - Documents/files to process OR bulk imports
2. **query** - Questions about existing data
3. **operations** - Create/update/delete specific entities
4. **general** - Greetings, help, unclear

# RULES
- Files present → "setup" (unless explicitly asking question)
- "quanto", "quais", "mostre" → "query"
- Giving data to create/update/delete → "operations"
- When unsure between query/operations → "operations"

Respond with ONE WORD: setup, query, operations, or general`
```

#### **4. Operations Agent Enhancement**

**Current Issues** (identified 2025-10-01):
- ❌ Too prescriptive prompts (violates ADR-008)
- ❌ Two-phase processing loses context
- ❌ No database access for entity lookup
- ❌ Missing conversation history in prompts
- ❌ Can't delegate to Query Agent

**Planned Enhancements**:

**Single-Phase Processing**:
```typescript
// BEFORE: Two separate Claude calls
1. classifyIntent() → { operation, entityType }
2. prepareEntityData() → { entityData }

// AFTER: One comprehensive call
understandCommand() → {
  operation,
  entityType,
  entityData,
  needsQuery,
  queryRequest,
  clarification
}
```

**Context-Rich Prompts** (ADR-008 compliant):
```typescript
`You are the Operations Agent for ArqCashflow.

# BUSINESS CONTEXT
- Today: ${date}
- Team ID: ${teamId}
- Language: Brazilian Portuguese
- Currency: Brazilian Reais (R$)

# DATABASE SCHEMA
[Complete schema like Query Agent provides]

# RECENT CONVERSATION
[Full conversation history]

# RECENTLY CREATED ENTITIES
[Last 10 entities created by any agent]

# AVAILABLE TOOLS
1. **Query Agent** - Lookup database information
2. **Service Layer** - Direct CRUD operations

# USER COMMAND
"${command}"

# TASK
Understand what user wants and respond with JSON:

{
  "operation": "create|update|delete",
  "entityType": "contract|receivable|expense|recurring_expense",
  "needsQuery": boolean,
  "queryRequest": "natural language query" | null,
  "entityData": { complete fields } | null,
  "clarificationNeeded": boolean,
  "clarificationQuestion": "text" | null
}

# GUIDELINES
- Trust your intelligence (you're Claude Sonnet 4)
- Use Query Agent when you need to lookup existing entities
- Be honest about ambiguity or missing required fields
- Infer dates, categories, amounts naturally`
```

**Query Agent Integration**:
```typescript
// NEW: Operations Agent can delegate to Query Agent
private async processWithQuerySupport(
  understanding: CommandUnderstanding,
  conversationState: ConversationState
): Promise<CommandResult> {

  // Use Query Agent to find entities
  const queryResult = await this.queryService.query(
    understanding.queryRequest!,
    this.buildQueryHistory(conversationState)
  )

  // Process with query results
  return await this.processWithQueryResults(
    understanding,
    queryResult,
    conversationState
  )
}
```

### **Model Strategy: Claude Sonnet 4 Everywhere**

**Decision (2025-10-01)**: Use Claude Sonnet 4 for ALL agents

**Rationale**:
- Quality and performance > cost optimization
- Sonnet 4 excels at context understanding
- Better multi-turn conversation handling
- Superior Brazilian Portuguese comprehension
- Reduces complexity (one model to tune)

**Updated Model Configuration**:
```typescript
// ALL agents use this
model: 'claude-sonnet-4-20250514'

// Router (was going to use Haiku)
const router = new AIAgentRouterService(context)
// Now uses Sonnet 4 for better accuracy

// Query Agent (already using Sonnet 4) ✅
const query = new FinancialQueryService(context)

// Operations Agent (already using Sonnet 4) ✅
const operations = new OperationsAgentService(context)

// Setup Assistant (to be upgraded to Sonnet 4)
const setup = new SetupAssistantService(context)
```

### **API Routes**

#### **New Unified Route**

**Location**: `app/api/ai/unified/route.ts`

**Purpose**: Single entry point for all AI interactions

```typescript
POST /api/ai/unified
{
  message: string,
  files?: File[],
  conversationState?: UnifiedConversationState
}

Response:
{
  success: boolean,
  response: string,
  agentUsed: 'setup' | 'query' | 'operations' | 'router',
  data: any,
  conversationState: UnifiedConversationState
}
```

#### **Existing Routes (Remain for Direct Access)**

```typescript
POST /api/ai/setup        // Direct Setup Agent access
POST /api/ai/query        // Direct Query Agent access
POST /api/ai/operations   // Direct Operations Agent access (renamed)
```

### **Example Interaction Flows**

#### **Flow 1: Multi-Turn with Context**

```
User: "R$100 em almoço"
Router: Classifies as "operations" → Routes to Operations Agent
Operations: Creates expense
Response: "✅ Despesa de almoço criada: R$ 100,00"

[State updated: recentlyCreated = [expense], lastAgent = "operations"]

User: "Quanto gastei hoje?"
Router: Classifies as "query" → Routes to Query Agent
Query: Aware of recent expense via conversation state
Response: "Você gastou R$ 100,00 hoje (1 despesa: almoço)"

[State updated: lastAgent = "query"]

User: "Deleta essa despesa"
Router: Classifies as "operations" → Routes to Operations Agent
Operations: Aware of recent expense, confirms deletion
Response: "Vou deletar a despesa de almoço (R$ 100,00). Confirma?"
```

#### **Flow 2: Operations Agent with Query Delegation**

```
User: "Deleta o contrato da Mari"
Router: → Operations Agent
Operations: Needs to find contract, delegates to Query Agent
  → queryRequest: "Find contracts with 'Mari' in client/project name"
  → Query Agent finds 2 matches
Operations: "Encontrei 2 contratos:
  1. Mariana Silva - Casa Moderna (R$ 120k)
  2. Mari Arquitetura - Escritório (R$ 85k)
  Qual deseja deletar?"

User: "O primeiro"
Operations: Uses context to know which contract
Response: "✅ Contrato deletado: Mariana Silva - Casa Moderna"
```

#### **Flow 3: Document then Query**

```
User: [uploads invoice.pdf]
Router: Has files → "setup"
Setup: Processes invoice, creates expense
Response: "✅ Criada 1 despesa: Material R$ 1.500,00"

[State: recentlyCreated = [expense], lastAgent = "setup"]

User: "Quantas despesas tenho esse mês?"
Router: → Query Agent (aware of just-created expense)
Query: Includes new expense in results
Response: "Você tem 12 despesas esse mês, total R$ 5.240,00"
```

### **Implementation Roadmap**

#### **Week 1: Router Foundation** ✅ **COMPLETE (2025-10-01)**
- ✅ Create `AIAgentRouterService.ts` (327 lines)
- ✅ Implement intent classification with Claude Sonnet 4
- ✅ Add routing logic for all agent types
- ✅ Create `/api/ai/unified` route (132 lines)
- ✅ Create unified conversation state types (187 lines)
- ✅ Rename CommandAgentService → OperationsAgentService
- ✅ Update all imports and references

#### **Week 2: Operations Agent Enhancement** ✅ **COMPLETE (2025-10-01)**
- ✅ Rename CommandAgent → OperationsAgent (DONE in Week 1)
- ✅ Add comprehensive database schema method (83 lines)
- ✅ Add Query Agent integration for entity lookups (165 lines)
- ✅ Enhanced intent classification with `needsQuery` detection
- ✅ Created test suite (test-unified-ai-system.ts, 184 lines)

#### **Week 3: Frontend Integration & UX Polish** ✅ **COMPLETE (2025-10-01)**
- ✅ **UI Integration**: Created "🚀 AI Unificado" tab in /ai-chat (default active)
- ✅ **Tab Architecture**: Unified tab + individual agent tabs for debugging
- ✅ **Conversation State Persistence**: Fixed critical bug where state was reset each message
  - Before: Fresh `conversationState: { messages: [] }` every request ❌
  - After: Preserves server-returned state with `...currentState` ✅
- ✅ **Pending Operation Tracking**: Explicit `pendingOperation` passing in requests
- ✅ **Visual Feedback System**:
  - Agent indicator badges (💬 Query=blue, 🎯 Operations=purple, 📄 Setup=green, 🤝 Router=orange)
  - Yellow pending operation banner when awaiting confirmation
  - Dynamic input placeholder based on state ("Digite 'sim' para confirmar..." vs normal)
  - Border color changes (yellow when pending operation)
  - Status footer showing message count and entities created
- ✅ **handleUnifiedSubmit**: Complete implementation (94 lines) with proper state management
- ✅ **Enhanced Logging**: Console logs for debugging state flow (12 log points)
- ✅ **Bug Fixes**:
  - State initialization overwriting server data → Now preserves properly
  - pendingOperation not passed → Now explicitly included in request
  - User confirmations without context → Now works with visual feedback

#### **Week 4: Production Rollout**
- ✅ A/B testing (old vs new endpoints)
- ✅ Monitor accuracy, latency, user satisfaction
- ✅ Gradual migration (10% → 50% → 100%)
- ✅ Deprecate old fragmented endpoints

### **Success Metrics**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Intent Classification Accuracy** | >95% | User doesn't need to manually switch agents |
| **Multi-Turn Context Retention** | 100% | Follow-up commands work seamlessly |
| **Query Delegation Success Rate** | >85% | Operations successfully uses Query when needed |
| **Response Time (P95)** | &lt;3s | Includes all agent processing |
| **User Satisfaction** | >90% | Thumbs up/down feedback |

### **ADR-008 Compliance**

✅ **Leverage Native LLM Capabilities**
- Router uses Sonnet 4's superior understanding
- Single-phase processing trusts Claude's intelligence
- Minimal preprocessing, maximum AI reasoning

✅ **Optimize for Experience, Not Cost**
- Claude Sonnet 4 everywhere (best quality)
- Full context windows utilized
- Multi-turn conversations seamless

✅ **Specialization Over Generalization**
- Router orchestrates, doesn't replace specialists
- Each agent remains focused on expertise
- Query Agent for reads, Operations for writes, Setup for batch

✅ **Context-Rich, Not Prescriptive**
- Full database schema shared
- Complete conversation history
- Recent entities tracked
- Examples shown, not rigid rules

✅ **API-Native Integration**
- Router uses existing services
- Operations delegates to Query
- Event system captures all actions
- Team isolation maintained

### **Technical Implementation Files**

**New Files**:
```
lib/services/AIAgentRouterService.ts          (Router orchestration)
lib/types/unified-conversation.ts             (Shared types)
app/api/ai/unified/route.ts                   (Unified endpoint)
```

**Renamed Files**:
```
lib/services/CommandAgentService.ts   → lib/services/OperationsAgentService.ts
app/api/ai/command/route.ts           → app/api/ai/operations/route.ts
lib/validation/api.ts                  (AISchemas.command → AISchemas.operations)
```

**Enhanced Files**:
```
lib/services/OperationsAgentService.ts        (Add context-rich prompts, Query integration)
lib/services/FinancialQueryService.ts         (Ensure Sonnet 4 usage documented)
lib/services/SetupAssistantService.ts         (Upgrade to Sonnet 4)
lib/ai/entity-schemas.ts                      (Database schema for all agents)
```

---

#### **4. Financial Audit Agent**
**"The Quality Control Specialist"**

**Purpose**: Proactively identify errors, inconsistencies, and anomalies
**Wow Factor**: "Catches mistakes before they become problems"

**Capabilities**:
- **Data validation**: Detect typos, mismatched amounts, impossible dates
- **Pattern analysis**: Compare against historical norms and industry standards
- **Relationship verification**: Cross-check receivables against contracts
- **Anomaly detection**: Unusual expenses, payment patterns, contract values

**Tools Available**:
- Read access to all financial APIs
- Statistical analysis of historical data
- Contract-receivable relationship validation
- Business context and pattern databases

**Context Provided**:
- User's historical financial patterns
- Industry norms for professional service firms
- Business size and typical project/contract values
- Seasonal and cyclical patterns

**Interaction Pattern**:
```
Agent: "I noticed the December office rent shows R$12k instead of your usual
        R$1.2k. Also, the ACME contract shows R$500k total value, but
        receivables only sum to R$350k - are you missing milestone payments?"
User: "Good catch! Rent was a typo. For ACME, they prepaid R$150k."
Agent: "Thanks! I'll flag similar patterns automatically. Your average
        contract is R$85k, but you have 3 recent contracts over R$200k -
        great growth trend!"
```

### **Advanced Business Agents (Phase 2)**

#### **4. Business Insights Agent**
**"The Strategic CFO"**

**Purpose**: Provide strategic business intelligence and recommendations
**Wow Factor**: "Understands your business better than you do"

**Capabilities**:
- **Trend analysis**: Contract size trends, client profitability, seasonal patterns
- **Performance insights**: Project profitability, efficiency metrics, growth opportunities
- **Strategic recommendations**: Pricing optimization, client retention, expansion opportunities
- **Competitive intelligence**: Industry benchmarking and positioning

**Tools Available**:
- Complete business analytics suite
- Historical trend analysis
- Industry benchmark data
- Predictive modeling capabilities

#### **5. Agent Coordinator**
**"The AI Traffic Controller"**

**Purpose**: Route user requests to the most appropriate specialist agent
**Wow Factor**: "Always connects you to the right expert instantly"

**Capabilities**:
- **Intent classification**: Understand what type of help user needs
- **Agent selection**: Route to optimal specialist agent
- **Context transfer**: Maintain conversation context across agents
- **Response synthesis**: Combine insights from multiple agents when needed

#### **6. Tax Intelligence Agent**
**"The Tax Optimization Expert"**

**Purpose**: Proactive tax planning and compliance management
**Wow Factor**: "Maximizes tax efficiency automatically"

**Capabilities**:
- **Tax calculation**: Project tax liabilities based on receivables and expenses
- **Optimization recommendations**: Tax-efficient timing and categorization
- **Compliance monitoring**: Ensure proper documentation and categorization
- **Framework assessment**: Recommend optimal business structures

### **Future Expansion Framework (Phase 3+)**

#### **Specialist Agent Marketplace**
- **Research Agents**: Market analysis, competitor intelligence
- **Design Agents**: Proposal templates, presentation assistance
- **Development Agents**: Platform customization, workflow automation
- **Industry Specialists**: Architecture-specific business intelligence

*Note: These expansion agents depend on business success and specific user needs identification.*

## 🏗️ **Technical Architecture**

### **Agent Infrastructure**

```typescript
// Core Agent Interface
interface AIAgent {
  id: string
  name: string
  purpose: string
  capabilities: string[]
  tools: AgentTool[]
  context: BusinessContext

  process(request: UserRequest): Promise<AgentResponse>
  validate(response: AgentResponse): boolean
}

// Agent-to-Service Integration
interface AgentTool {
  type: 'api' | 'service' | 'event'
  endpoint?: string
  service?: ServiceInstance
  permissions: Permission[]
}

// Business Context Interface
interface BusinessContext {
  teamId: string
  businessType: 'individual' | 'company'
  businessModel: ArchitectureFirmProfile
  financialHistory: FinancialSummary
  industryBenchmarks: IndustryData
}
```

### **Integration Patterns**

#### **Service Layer Integration**
```typescript
// Agents use existing service layer
const contractService = new ContractService(teamContext)
const contracts = await contractService.findMany(filters)

// Event system for coordination
await eventBus.emit({
  type: 'agent.analysis_complete',
  agentId: 'financial-audit',
  insights: auditResults
})
```

#### **Security & Isolation**
- **Team Context**: All agents respect team isolation automatically
- **Permission Model**: Each agent has specific API permissions
- **Audit Trail**: All agent actions logged through event system
- **Data Privacy**: No cross-team data access or learning

## 📊 **Implementation Roadmap**

### **🎯 REVISED IMPLEMENTATION STRATEGY (Updated 2025-09-27)**

**STRATEGIC PIVOT**: After comprehensive analysis, we are pivoting from "build new agent" to "incrementally upgrade existing proven system".

**Architecture Decision**: Upgrade existing working setup assistant (`/api/ai/setup-assistant-direct`) incrementally rather than complete new OnboardingIntelligenceAgent.
**Priority**: Preserve 100% working functionality while gaining architectural benefits with minimal risk.
**Rationale**:
- Current system: 100% working file processing, sophisticated Brazilian business rules, production battle-tested
- New agent: 90% complete but needs significant work (Excel reliability, PDF JSON parsing, business logic)
- Risk assessment: HIGH risk with new agent vs LOW risk with incremental upgrade
- Effort comparison: 30% refactoring vs 70% new development

### **📈 Current Implementation Status (2025-09-27) - READY FOR PHASE 1**

#### **✅ Setup Assistant Baseline - VALIDATED**

**✅ Research Completed (90%)**:
- Core agent implementation with Claude AI integration
- API endpoint with authentication and team isolation
- CSV file processing with 100% success rate (15/15 entities)
- Service layer integration patterns established
- Fixed circular reference bug in team-scoped Prisma context
- PDF processing working with Claude Sonnet 4 document API

**⚠️ Issues Identified Leading to Strategic Pivot**:
- Excel processing: Preprocessing works but extraction inconsistent (0 entities vs proven system)
- PDF JSON parsing: Needs significant prompt tuning for structured responses
- Missing sophisticated Brazilian business logic from current working system
- Would require ~70% rewrite to match production system capabilities

**📨 Strategic Decision**: Pause new agent development, pivot to incremental upgrade of existing proven system

#### **🚀 NEW PRIORITY: Incremental Setup Assistant Upgrade**

**Current Proven System**: `/api/ai/setup-assistant-direct` ("Assistente IA > Configuração Rápida")
- ✅ **CSV Processing**: 4 contracts, 4 receivables, 7 expenses (~60s) - VALIDATED
- ✅ **Excel Processing**: 37 contracts (~60s) - VALIDATED
- ✅ **PDF Processing**: 1 contract (~60s) - VALIDATED
- ✅ **UI Integration**: Working through onboarding flow - VALIDATED
- ✅ **Team Isolation**: All entities properly scoped - VALIDATED
- ✅ **Brazilian Business Logic**: Sophisticated proposta/orçamento/contrato handling - WORKING

**Upgrade Strategy**: 3-phase incremental improvement
1. **Phase 1 (Week 1)**: Service layer integration - preserve ALL existing functionality (4c,4r,7e | 37c | 1c)
2. **Phase 2 (Week 2)**: Team context middleware and validation standardization
3. **Phase 3 (Week 3-4)**: Enhanced features (multi-file, interactive clarification)

**Testing Validation**: Use `test-setup-assistant-baseline-final.ts` to ensure zero regression

### **🚀 NEW IMPLEMENTATION ROADMAP (2025-09-27)**

### **Phase 1: Service Layer Integration (Week 1) - URGENT**
**Goal**: Modernize architecture while preserving 100% working functionality

**Current Challenge**: Setup assistant uses direct Prisma calls, missing service layer benefits
**Strategy**: Extract `SetupAssistantService` class using existing service patterns
**Implementation**:
- Create `SetupAssistantService` extending `BaseService`
- Integrate with `ContractService`, `ExpenseService`, `ReceivableService`
- Preserve ALL existing Claude prompts and business logic
- Add automatic audit logging through service layer
- Deploy as `/api/ai/setup-assistant-v2` alongside existing for A/B testing
**Success Criteria**: Zero functional regression, same user experience with better architecture

### **Phase 2: Platform Compliance (Week 2) - HIGH PRIORITY**
**Goal**: Achieve consistency with platform patterns and enhance security

**Current Challenge**: Manual auth checking, inconsistent validation patterns
**Strategy**: Add `withTeamContext` middleware and existing validation schemas
**Implementation**:
- Replace `requireAuth()` with `withTeamContext` middleware
- Integrate existing validation schemas from `BaseFieldSchemas`
- Enhanced error reporting with service layer patterns
- A/B test enhanced version against Phase 1 version
**Success Criteria**: Consistent with platform patterns, improved error handling

### **Phase 3: Enhanced Features (Week 3-4) - MEDIUM PRIORITY**
**Goal**: Add new capabilities while maintaining proven foundation

**Current Challenge**: Single file limitation, no interactive clarification
**Strategy**: Extend proven single-file logic to multi-file, add clarification framework
**Implementation**:
- Multi-file processing using proven single-file logic as foundation
- Progress tracking and enhanced UX feedback
- Interactive clarification framework for missing fields
- Full migration from old endpoint
**Success Criteria**: Superior UX with multi-file support and user guidance

### **Future Phases (Deferred Until Setup Assistant Upgrade Complete)**

**Phase 4: Financial Query Agent Enhancement**
- Refactor existing `/api/ai/query` using patterns learned from setup assistant upgrade
- Apply service layer integration and team context patterns
- Add business context and conversation memory

**Phase 5: Financial Audit Agent**
- New proactive monitoring agent for data quality
- Background anomaly detection
- Dashboard integration for quality alerts

**Phase 6: Agent Framework Extraction**
- Extract common patterns from upgraded setup assistant
- Create reusable `AgentService` base class
- Implement `BusinessContextService` for shared intelligence

### **Long-term Vision (Post-Setup Assistant Upgrade)**

**Phase 7-8: Advanced Intelligence (Future)**
1. **Business Insights Agent** - Strategic CFO-level intelligence
2. **Agent Coordinator** - Multi-agent routing and context transfer
3. **Tax Intelligence Agent** - Compliance and optimization

**Phase 9+: Platform Expansion (Future)**
1. **Specialist marketplace** - Industry-specific agents
2. **Third-party integrations** - Ecosystem expansion
3. **Multi-industry expansion** - Beyond architecture firms

**Key Learning**: Focus on incremental improvement of proven systems rather than clean-slate development for faster time-to-value and lower risk.

## 🏗️ **Incremental Architecture Strategy (Updated 2025-09-27)**

### **Strategic Approach: Incremental Upgrade vs Clean Slate**
After comprehensive analysis, we are upgrading the existing proven setup assistant incrementally rather than building new agents from scratch.

#### **Phase 1: Service Layer Integration**
**Current State**: Direct Prisma calls in `/api/ai/setup-assistant-direct`
```typescript
// Current: Direct database operations
await prisma.contract.create({
  data: {
    clientName: contractData.clientName,
    projectName: contractData.projectName,
    totalValue: Number(contractData.totalValue),
    teamId
  }
})
```

**Target State**: Service layer integration while preserving all business logic
```typescript
// Upgraded: Service layer with audit logging
class SetupAssistantService extends BaseService {
  private contractService: ContractService
  private expenseService: ExpenseService
  private receivableService: ReceivableService

  async processDocuments(files: File[]): Promise<ProcessingResult> {
    // Preserve ALL existing Claude prompts and business logic
    const contractResults = await this.contractService.bulkCreate(contracts, { continueOnError: true })
    // Automatic audit logging and validation
  }
}
```

#### **Phase 2: Team Context Middleware**
**Current State**: Manual authentication
```typescript
// Current: Manual auth check
const { user } = await requireAuth()
```

**Target State**: Standard platform middleware
```typescript
// Upgraded: Standard team context
export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const setupService = new SetupAssistantService(context)
    return await setupService.processDocuments(files)
  })
}
```

#### **Phase 3: Enhanced Features**
**Current State**: Single file processing
**Target State**: Multi-file support with interactive clarification

### **Implementation Philosophy - Revised**
1. **Preserve Working Logic**: Keep 100% of proven business rules and Claude prompts
2. **Incremental Architecture**: Add modern patterns without breaking functionality
3. **Risk Minimization**: A/B testing and gradual rollout at each phase
4. **Business Continuity**: Users continue using working system during upgrade
5. **Value First**: Each phase delivers immediate architectural benefits

## 🔧 **Technical Implementation Challenges**

### **File Type Processing Solutions**

#### **PDF Files - ✅ RESOLVED**
- **✅ Claude Native Support**: Claude Sonnet 4 has native PDF processing via document API
- **✅ Correct Implementation**: Use `type: 'document'` with `media_type: 'application/pdf'`
- **✅ Test Results**: Successfully processes PDFs up to 992KB+ with intelligent content analysis
- **⚠️ JSON Response**: Requires prompt tuning to ensure structured JSON output

```typescript
// ✅ CORRECT PDF API usage
content.push({
  type: 'document',  // Not 'image'
  source: {
    type: 'base64',
    media_type: 'application/pdf',
    data: file.base64
  }
})
```

#### **Excel Files (.xlsx) - ❌ LIMITED SUPPORT**
- **❌ No Native Support**: Claude document API only accepts `application/pdf`, not Excel
- **✅ Confirmed Limitation**: Testing shows `400` error for Excel media types
- **✅ Working Solution**: Use preprocessing with xlsx libraries before Claude
- **📋 Current Approach**: Existing assistant uses filename fallback for Excel files

#### **CSV Files - ✅ WORKING**
- **✅ Perfect Results**: 100% success rate (15/15 entities extracted and created)
- **✅ Text Processing**: Direct text analysis works flawlessly
- **✅ Complex Data**: Handles mixed contracts, expenses, receivables correctly

#### **Image Files - ✅ SUPPORTED**
- **✅ Claude Vision**: Native support via `type: 'image'` API
- **✅ Media Types**: Supports JPEG, PNG, GIF, WebP formats
- **⚠️ Untested**: Implementation correct based on existing assistant patterns

### **Interactive Clarification Design**

```typescript
interface ClarificationRequest {
  missingFields: {
    entity: string
    field: string
    reason: string
    suggestions?: string[]
  }[]
  ambiguousData: {
    entity: string
    field: string
    currentValue: any
    possibleInterpretations: any[]
  }[]
}
```

## 🎯 **Success Metrics**

### **User Experience Metrics**
- **Time to Value**: Onboarding completion time (target: under 15 minutes)
- **Query Resolution**: % of questions answered accurately without clarification
- **Error Prevention**: % of data issues caught before user notices
- **Insight Relevance**: User rating of business insights provided

### **Business Metrics**
- **User Activation**: % of users who complete AI-assisted onboarding
- **User Retention**: Weekly/monthly active usage of AI features
- **Feature Adoption**: % of users using each agent type
- **Revenue Impact**: Upgrade rates attributed to AI features

### **Technical Metrics**
- **Response Time**: Average time for agent responses
- **Accuracy Rate**: % of agent outputs requiring no correction
- **API Efficiency**: Average API calls per user interaction
- **Error Rate**: Failed agent operations per 1000 requests

## 🔒 **Security & Compliance**

### **Data Protection**
- **Team Isolation**: Strict enforcement of team-based data access
- **Encryption**: All agent communications encrypted in transit and at rest
- **Audit Logging**: Complete trail of all agent actions and decisions
- **Privacy**: No learning from user data, no cross-team information sharing

### **Business Security**
- **Financial Accuracy**: Multi-layer validation for all financial operations
- **Approval Workflows**: User confirmation for high-impact actions
- **Rollback Capability**: Ability to reverse agent-created entries
- **Human Override**: Always allow manual correction and override

## 📝 **Agent-Specific Implementation Notes**

### **Onboarding Intelligence Agent**
- **Multimodal processing**: Handle Excel, PDF, images simultaneously
- **Iterative refinement**: Multiple rounds of clarification and correction
- **Bulk operations**: Efficient batch creation of financial entries
- **Progress tracking**: Real-time feedback during processing

### **Financial Query Agent**
- **Context awareness**: Remember conversation history and user preferences
- **Visual responses**: Generate charts and graphs for complex data
- **Drill-down capability**: Allow progressive detail exploration
- **Export integration**: Connect insights to reporting and export features

### **Financial Audit Agent**
- **Continuous monitoring**: Background analysis of new entries
- **Severity classification**: Distinguish between errors, warnings, and info
- **Learning patterns**: Understand user's business patterns over time
- **Proactive alerts**: Surface issues before they become problems

## 🚀 **Competitive Advantages**

This AI agent strategy creates multiple competitive moats:

1. **Data Network Effects**: Better insights as more architecture firms join
2. **Industry Specialization**: Deep understanding of architecture business models
3. **Multimodal Intelligence**: Native document and spreadsheet processing
4. **Proactive Intelligence**: Prevents problems rather than just reporting them
5. **Seamless Integration**: Feels like natural extension of the platform

## 📈 **Future Vision**

**6 Months**: ArqCashflow becomes the "AI-powered financial brain" for small professional service firms
**12 Months**: Platform intelligence rivals dedicated CFO for small businesses
**18 Months**: Industry-leading financial AI creates sustainable competitive advantage
**24 Months**: Expansion into adjacent business sectors and international markets

---

This AI agent strategy transforms ArqCashflow from a financial management tool into an intelligent business partner that grows more valuable over time, creating strong user stickiness and competitive differentiation in the professional services software market.