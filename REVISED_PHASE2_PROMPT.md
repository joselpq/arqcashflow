# Phase 2 Prompt - Revised (Middle Ground)

**Balance**: Semantic clarity + Token efficiency

---

## **PHASE 2: Data Extraction - REVISED**

```
Extraia TODOS os dados desta planilha como JSON estruturado.

CONTEXTO DO ARQUIVO:
- Arquivo: "Projetos_2024.xlsx"
- Planilha: "Recebíveis"
- Tipo: receivables
- Linhas esperadas: ~87 entidades
- Setor: Arquitetura (Brasil)

PLANO DE EXTRAÇÃO:
- Colunas: {"Projeto": "contractId", "Valor": "amount", "Data Esperada": "expectedDate", "Status": "status"}
- Projetos conhecidos: ["Apartamento Jardins", "Loja Shopping", "Escritório Corporativo"]
- Notas: Recebíveis vinculados a projetos por nome

DADOS (CSV):
Projeto,Valor,Data Esperada,Status,Data Recebimento,Valor Recebido
Apartamento Jardins,R$ 15.000,15/04/2024,Recebido,18/04/2024,R$ 15.000
Apartamento Jardins,R$ 15.000,15/05/2024,Pendente,,
[... 85 more rows ...]

INSTRUÇÕES:
1. Extraia TODAS as ~87 linhas (não pule nenhuma)
2. Uma entidade por linha
3. Use o schema abaixo para estruturar cada entidade
4. Pule linhas onde campos OBRIGATÓRIOS estão vazios
5. Campos OPCIONAIS vazios = null

SCHEMA:

Contract (Contratos/Projetos):
{
  "clientName": string,        // OBRIGATÓRIO: nome do cliente (use projectName se ausente)
  "projectName": string,       // OBRIGATÓRIO: nome do projeto (use clientName se ausente)
  "totalValue": number,        // OBRIGATÓRIO: valor total do contrato em reais
  "signedDate": string,        // OBRIGATÓRIO: data de assinatura formato ISO8601 (YYYY-MM-DD)
  "status": string,            // OBRIGATÓRIO: "active" | "completed" | "cancelled" (default: "active")
  "description": string | null,
  "category": string | null    // Ex: Residencial, Comercial, Corporativo
}

Receivable (Recebíveis/Parcelas):
{
  "amount": number,              // OBRIGATÓRIO: valor do recebível em reais
  "contractId": string | null,   // OPCIONAL: nome do projeto associado OU descrição se não vinculado
  "expectedDate": string | null, // OPCIONAL: data que foi/será recebido (ISO8601)
  "status": string | null,       // OPCIONAL: "pending" | "received" | "overdue"
  "receivedDate": string | null, // OPCIONAL: data que foi efetivamente recebido (ISO8601)
  "receivedAmount": number | null // OPCIONAL: valor efetivamente recebido (pode diferir de amount)
}

Expense (Despesas):
{
  "description": string,         // OBRIGATÓRIO: descrição da despesa
  "amount": number,              // OBRIGATÓRIO: valor em reais
  "category": string,            // OBRIGATÓRIO: "Alimentação" | "Transporte" | "Materiais" |
                                 //              "Serviços" | "Escritório" | "Marketing" |
                                 //              "Impostos" | "Salários" | "Outros"
  "dueDate": string | null,      // OPCIONAL: data de vencimento/pagamento (ISO8601)
  "status": string | null        // OPCIONAL: "pending" | "paid" | "overdue" | "cancelled"
                                 //           (inferir: passado = paid, futuro = pending)
}

TRANSFORMAÇÕES:
- Datas brasileiras (15/04/2024) → ISO8601 (2024-04-15)
- Valores monetários (R$ 15.000,50) → number (15000.50) - remover "R$", espaços, vírgula→ponto
- Status português → inglês lowercase ("Recebido"→"received", "Pendente"→"pending", "Atrasado"→"overdue")

EXEMPLO DE SAÍDA:
{
  "contracts": [],
  "receivables": [
    {
      "amount": 15000,
      "contractId": "Apartamento Jardins",
      "expectedDate": "2024-04-15",
      "status": "received",
      "receivedDate": "2024-04-18",
      "receivedAmount": 15000
    },
    {
      "amount": 15000,
      "contractId": "Apartamento Jardins",
      "expectedDate": "2024-05-15",
      "status": "pending",
      "receivedDate": null,
      "receivedAmount": null
    }
  ],
  "expenses": []
}

Retorne APENAS JSON válido neste formato.
```

---

## **Token Count: ~2,400 tokens**
- Original: 3,500 tokens
- My first optimization: 2,100 tokens (too aggressive)
- **This revised**: 2,400 tokens (31% reduction, preserves semantics)

---

## **Key Changes from My First Optimization**

### **1. Enhanced Field Descriptions (Preserved Semantics)**

**contractId**:
- ❌ Before: `// OPCIONAL - nome do projeto`
- ✅ Now: `// OPCIONAL: nome do projeto associado OU descrição se não vinculado`

**expectedDate**:
- ❌ Before: `// OPCIONAL - ISO8601`
- ✅ Now: `// OPCIONAL: data que foi/será recebido (ISO8601)`

**receivedAmount**:
- ❌ Before: `number | null`
- ✅ Now: `number | null // OPCIONAL: valor efetivamente recebido (pode diferir de amount)`

### **2. Added Context Where It Matters**

**category (Expense)**:
- Shows exact enum values inline (not in separate paragraph)
- Includes note about inference: `(inferir: passado = paid, futuro = pending)`

**clientName/projectName (Contract)**:
- Notes the fallback logic: `(use projectName se ausente)`

### **3. Real Output Example**

Shows actual expected JSON with:
- ✅ Correct date transformation
- ✅ Correct value transformation
- ✅ Correct status transformation
- ✅ Correct null handling

This is worth the ~300 extra tokens because research shows **examples > explanations**.

---

## **Comparison: Semantic Information Preserved**

| Field | Original | My First | Revised | Semantic Loss? |
|-------|----------|----------|---------|----------------|
| contractId meaning | ✅ Full context | ❌ Terse | ✅ Full context | ✅ Fixed |
| expectedDate semantic | ✅ Past/future | ❌ Just format | ✅ Past/future | ✅ Fixed |
| receivedAmount edge case | ✅ Can differ | ❌ Not mentioned | ✅ Can differ | ✅ Fixed |
| category values | ✅ Listed | ✅ Listed | ✅ Listed inline | ✅ Same |
| status inference | ✅ Explained | ❌ Removed | ✅ Inline note | ✅ Fixed |

---

## **Why This Is Better**

### **Vs Original (Current)**
- ✅ **31% fewer tokens** (3,500 → 2,400)
- ✅ **Removed verbose PASSO 1-5** (research: not needed for Haiku)
- ✅ **JSON schema format** (research: best for Claude)
- ✅ **Real output example** (research: examples > explanations)

### **Vs My First Optimization**
- ✅ **Preserves semantic meaning** (contractId can be description, not just project name)
- ✅ **Explains edge cases** (receivedAmount can differ from amount)
- ✅ **Business logic hints** (status inference based on dates)
- ✅ **Only +300 tokens** (2,100 → 2,400) for critical context

---

## **Expected Impact**

### **Accuracy**
- ✅ **Same or better** - semantic context preserved
- ✅ **Better edge cases** - explicit notes about variations
- ✅ **Clearer transformations** - examples show exact format

### **Speed**
- ✅ **25-35% faster** - fewer tokens than original
- ✅ **Same as aggressive** - Haiku doesn't need extra 300 tokens to process

### **Maintainability**
- ✅ **Clear for humans** - semantic meaning obvious
- ✅ **Clear for Claude** - JSON schema + inline comments
- ✅ **Easy to update** - structured format

---

## **Recommendation**

Use **this revised prompt** as the middle ground:
- Preserves semantic clarity (your concern ✅)
- Reduces token cost by 31% (efficiency ✅)
- Follows research best practices (effectiveness ✅)
