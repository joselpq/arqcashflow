# Step 2: Simple Expense Creation - Testing Guide

**Date**: 2025-10-02
**Status**: Ready for testing

## What's New in Step 2

✅ **Expense Creation**: Can now create expenses from natural language
✅ **Smart Date Parsing**: "ontem", "hoje", "amanhã"
✅ **Category Inference**: "gasolina" → Transporte
✅ **Amount Parsing**: "R$50", "50 reais"
✅ **Still Converses**: Can chat normally when not creating expenses

**Total Lines of Code**: ~138 lines (up from 45)

## System Prompt Enhancements

Now includes:
- Current date context
- Expense database schema
- Valid categories (6 options)
- JSON response format for expense creation
- Date inference rules

## Test Commands

### Basic Expense Creation

1. **Simple expense**:
   ```
   R$50 em gasolina
   ```
   Expected: Creates expense with today's date, Transport category

2. **With date reference**:
   ```
   R$30 em almoço ontem
   ```
   Expected: Creates expense with yesterday's date, Food category

3. **Different category**:
   ```
   R$100 em material de escritório
   ```
   Expected: Creates expense with Office category

4. **Tomorrow**:
   ```
   R$25 em uber amanhã
   ```
   Expected: Creates expense with tomorrow's date, Transport category

### Conversation Still Works

5. **Normal chat**:
   ```
   Oi, como vai?
   ```
   Expected: Normal friendly response (NOT creating expense)

6. **Ask about capabilities**:
   ```
   O que você pode fazer?
   ```
   Expected: Explains it can create expenses and chat

7. **Follow-up after creating**:
   ```
   R$50 em gasolina
   ```
   Then:
   ```
   Obrigado!
   ```
   Expected: First creates expense, then responds normally to thanks

### Edge Cases

8. **Missing information**:
   ```
   Gastei dinheiro
   ```
   Expected: Asks for more details (amount, what was it for)

9. **Ambiguous category**:
   ```
   R$200 em coisas
   ```
   Expected: Might ask what kind of things, or default to "Outros"

10. **Invalid amount**:
    ```
    Despesa de zero reais
    ```
    Expected: Should handle gracefully (might ask for valid amount)

## Expected Response Format

When creating an expense, you should see:

```
✅ Despesa criada com sucesso!

📝 gasolina
💰 R$ 50.00
📅 02/10/2025
🏷️ Transporte
```

## How to Test

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser**: http://localhost:3000

3. **Navigate to**: Assistente IA → 🚀 AI Unificado

4. **Try the commands above**

5. **Verify in database**:
   - Go to Despesas page
   - Check if expenses were created correctly
   - Verify dates, amounts, categories

## Verification Checklist

After testing, verify:
- [ ] Can create basic expenses
- [ ] Date parsing works (ontem, hoje, amanhã)
- [ ] Category inference works
- [ ] Amount parsing works (R$, reais, numbers)
- [ ] Normal conversation still works
- [ ] Conversation context is maintained
- [ ] Error messages are helpful
- [ ] Expenses appear in database correctly

## Known Limitations (By Design)

❌ **No confirmation** - Creates immediately (Step 3 will add this)
❌ **Only expenses** - Can't create contracts/receivables yet (Step 5)
❌ **No updates/deletes** - Only creation (Step 4)
❌ **No batch operations** - One at a time (Step 6)

## What's Next (Step 3)

After Step 2 is validated:
- Add confirmation workflow
- Preview before creating
- User can approve/reject
- "sim"/"não" handling

## Troubleshooting

**If expenses aren't created**:
1. Check browser console for errors
2. Check server logs for JSON parsing issues
3. Verify Claude is returning JSON format
4. Check if ExpenseService is throwing validation errors

**If conversation doesn't work**:
1. Verify conversation history is being passed
2. Check if Claude is always returning JSON (it shouldn't)
3. Test with simple chat first

**If categories are wrong**:
1. Check the system prompt has all 6 categories
2. Verify Claude's category mapping logic
3. Test with more specific descriptions

## Success Criteria

✅ Step 2 is complete when:
1. All basic test commands work
2. Conversation context is maintained
3. Expenses are created correctly in database
4. Error handling is graceful
5. No regression from Step 1 (chat still works)

---

**Current Status**: Implementation complete, ready for user testing
**Next Step**: After validation, proceed to Step 3 (Confirmation Workflow)
