---
title: "Global Chat with Arnaldo"
type: "feature"
audience: ["developer", "user"]
contexts: ["chat", "ai", "ux", "react"]
complexity: "intermediate"
last_updated: "2025-10-08"
version: "1.0"
agent_roles: ["frontend-developer", "ai-developer", "ux-designer"]
related:
  - agents/contexts/ai-assistant.md
  - developer/architecture/overview.md
  - decisions/008-ai-agent-strategy.md
dependencies: ["react", "anthropic-sdk", "OperationsAgentService"]
---

# Global Chat with Arnaldo

## Context for LLM Agents

**Scope**: Persistent floating chat interface accessible from all pages in ArqCashflow
**Prerequisites**: Understanding of React Context API, custom browser events, and Claude API integration
**Key Patterns**:
- Floating Action Button (FAB) pattern for global access
- React Context for state management
- Custom browser events for live data refresh
- Integration with existing OperationsAgentService

## Overview

The Global Chat feature provides users with instant access to Arnaldo, the AI financial assistant, from any page in the application through a floating button in the bottom-right corner.

### Key Features

- **Global Accessibility**: Available from all entity pages (Projetos, Recebíveis, Despesas, Dashboard)
- **Keyboard Shortcut**: `Cmd/Ctrl + /` to open chat
- **Live Data Refresh**: Automatically updates page data when chat creates/modifies entries
- **Mobile Responsive**: Full-width drawer on mobile, 400px on desktop
- **Conversation History**: Maintains full and display history for context preservation

## Architecture

### Component Structure

```
Global Chat System:
├── ChatContext (State Management)
│   ├── Messages state (display history)
│   ├── Full conversation history (with internal messages)
│   ├── Loading state
│   └── API integration with OperationsAgentService
├── GlobalChat (Wrapper Component)
│   ├── Keyboard shortcut listener (Cmd/Ctrl + /)
│   └── Renders FAB + ChatPanel
├── ArnaldoChatFAB (Floating Button)
│   ├── Fixed bottom-right position
│   └── Gradient blue-purple styling
├── ChatPanel (Main Drawer)
│   ├── ChatHeader
│   ├── MessageList
│   └── ChatInput
└── Live Refresh System
    ├── Event emission on data changes
    └── Page listeners for auto-refresh
```

### File Locations

```typescript
app/
├── contexts/
│   └── ChatContext.tsx           // State management, API calls
├── components/chat/
│   ├── GlobalChat.tsx            // Wrapper with keyboard shortcut
│   ├── ArnaldoChatFAB.tsx        // Floating action button
│   ├── ChatPanel.tsx             // Main drawer container
│   ├── ChatHeader.tsx            // Header with close button
│   ├── MessageList.tsx           // Message display + welcome screen
│   └── ChatInput.tsx             // Textarea input with auto-resize
└── layout.tsx                     // Integration point (ChatProvider + GlobalChat)
```

## Implementation Details

### 1. State Management (ChatContext)

```typescript
// app/contexts/ChatContext.tsx
interface ChatContextType {
  isOpen: boolean
  messages: Message[]              // Display messages (user-facing)
  loading: boolean
  fullHistory: ConversationMessage[] // Complete history (with internal messages)
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  sendMessage: (message: string) => Promise<void>
  clearHistory: () => void
}

// Message types
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}
```

**Key Implementation Points:**
- Maintains both `fullHistory` (sent to backend) and `messages` (displayed to user)
- Backend may include internal messages like `[QUERY_RESULTS]` that aren't shown to users
- Emits `arnaldo-data-updated` event after successful operations for live refresh

### 2. Live Data Refresh System

**Event Emission (ChatContext):**
```typescript
// After successful API response
window.dispatchEvent(new CustomEvent('arnaldo-data-updated'))
```

**Event Listeners (Entity Pages):**
```typescript
// app/expenses/page.tsx, app/receivables/page.tsx, etc.
useEffect(() => {
  const handleDataUpdate = () => {
    fetchExpenses()
    fetchContracts()
  }

  window.addEventListener('arnaldo-data-updated', handleDataUpdate)
  return () => window.removeEventListener('arnaldo-data-updated', handleDataUpdate)
}, [filters]) // Re-fetch with current filter state
```

**Pages with Live Refresh:**
- `/expenses` - Expenses page
- `/receivables` - Receivables page
- `/contracts` - Contracts standalone page
- `/projetos` - ContractsTab component

### 3. Keyboard Shortcut Implementation

```typescript
// app/components/chat/GlobalChat.tsx
useEffect(() => {
  const handleKeyboard = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault()
      openChat()
    }
  }

  document.addEventListener('keydown', handleKeyboard)
  return () => document.removeEventListener('keydown', handleKeyboard)
}, [openChat])
```

### 4. Mobile Responsive Design

**Breakpoints:**
- Desktop: `md:w-[400px]` (400px fixed width)
- Mobile: `w-full` (full screen width)

**Backdrop:**
- Desktop: No backdrop (chat panel slides over content)
- Mobile: `bg-black/30` backdrop with tap-to-close

**Animation:**
- Slide transition: `translate-x-0` (open) / `translate-x-full` (closed)
- Duration: `duration-300 ease-in-out`

## Integration with OperationsAgentService

### API Endpoint

```typescript
POST /api/ai/operations
```

### Request Format

```typescript
{
  message: string,                    // User's message
  conversationHistory: ConversationMessage[] // Full history for context
}
```

### Response Format

```typescript
{
  message: string,                    // AI response (legacy)
  conversationHistory: ConversationMessage[], // Full history including internal messages
  displayHistory: ConversationMessage[]      // User-facing messages only
}
```

**Note**: Chat prioritizes `displayHistory` if present, falls back to `conversationHistory`, then to single `message` field for backward compatibility.

## User Experience

### Welcome Screen

When chat is opened with no messages:
```
Olá, sou Arnaldo, seu assistente financeiro 👋

Posso responder perguntas sobre as suas finanças, adicionar novos
projetos, despesas e recebíveis, ou atualizar e deletá-los, basta pedir!

Alguns exemplos:
• "Quanto faturei em setembro?"
• "recebi 500 reais do projeto João e Maria"
• "salário Pedro R$5k todo dia 5"
• "aumentar o salário do Pedro para 5500 a partir de Janeiro"
```

### Message Flow

1. User types message and presses Enter (Shift+Enter for new line)
2. Message appears immediately in chat with timestamp
3. Loading indicator shows (3 bouncing dots)
4. AI response streams back from OperationsAgentService
5. If operation created/updated data, page refreshes automatically
6. User can continue conversation with full context preserved

### Keyboard Controls

- **Cmd/Ctrl + /**: Open chat
- **Escape**: Close chat
- **Enter**: Send message
- **Shift+Enter**: New line in message

## Testing

### Manual Testing Checklist

- [ ] FAB button visible on all pages
- [ ] Click FAB opens chat panel
- [ ] Cmd/Ctrl + / opens chat
- [ ] Escape key closes chat
- [ ] Messages send and receive correctly
- [ ] Conversation history preserved across messages
- [ ] Live refresh works when creating/updating entries
- [ ] Mobile responsive (full-width drawer)
- [ ] Desktop responsive (400px drawer)
- [ ] Loading indicator shows during API calls
- [ ] Error messages display correctly

### Integration Testing

```bash
# Start development server
npm run dev

# Test flow:
# 1. Navigate to /expenses
# 2. Open chat (Cmd/Ctrl + /)
# 3. Send: "salário Pedro R$5k todo dia 5"
# 4. Verify expense appears in list without refresh
# 5. Send: "Quanto gastei este mês?"
# 6. Verify response includes created expense
```

## Performance Considerations

### Bundle Size

Global Chat adds ~5KB to shared bundle:
- ChatContext: ~1.5KB
- Chat components: ~3KB
- GlobalChat wrapper: ~0.5KB

### Network Impact

- Chat only loads when user opens it (lazy loading considered but not needed for 5KB)
- API calls only when user sends messages
- No polling or WebSocket connections (event-based refresh is one-way)

### Memory Management

- Event listeners properly cleaned up on unmount
- Conversation history limited to session (no localStorage yet)
- Full history maintained in memory for context

## Future Enhancements

### Potential Additions

1. **Markdown Support**: Render AI responses with rich formatting
2. **Message History Persistence**: Save conversations to localStorage
3. **"Limpar Histórico" Button**: Clear conversation manually
4. **Minimize Button**: Collapse to small badge instead of closing
5. **Unread Indicator**: Show badge when new messages while chat closed
6. **Voice Input**: Microphone button for voice-to-text

### Known Limitations

- No persistence across browser sessions (messages cleared on refresh)
- No multi-tab synchronization (each tab has independent chat)
- No typing indicators for long AI responses
- No read receipts or message status indicators

## Troubleshooting

### Chat Not Opening

**Check:**
1. ChatProvider is in layout.tsx
2. GlobalChat component is rendered
3. No JavaScript errors in console
4. Keyboard shortcut not conflicting with browser/OS shortcuts

### Messages Not Sending

**Check:**
1. Network tab shows POST to `/api/ai/operations`
2. Authentication is valid (session not expired)
3. OperationsAgentService is running
4. Claude API key is configured

### Live Refresh Not Working

**Check:**
1. `arnaldo-data-updated` event is being dispatched
2. Entity pages have event listeners attached
3. Event listeners include current filters in dependency array
4. Fetch functions are being called correctly

## Related Documentation

- [AI Agent Strategy](../decisions/008-ai-agent-strategy.md) - Operations Agent architecture
- [AI Assistant Development](../agents/contexts/ai-assistant.md) - General AI patterns
- [Architecture Overview](../developer/architecture/overview.md) - System integration

---

*Global Chat provides seamless access to Arnaldo AI from anywhere in ArqCashflow, with intelligent context preservation and automatic data synchronization.*
