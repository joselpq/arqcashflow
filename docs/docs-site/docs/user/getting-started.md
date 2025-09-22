---
title: "Getting Started with ArqCashflow"
type: "guide"
audience: ["user"]
contexts: ["onboarding", "basic-usage"]
complexity: "beginner"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["user-guide-creator"]
related:
  - user/features/contracts.md
  - user/features/receivables.md
dependencies: []
---

# Getting Started with ArqCashflow

ArqCashflow is a secure, multi-tenant cashflow management system designed for architects to track contracts, receivables, and analyze financial data using AI with team-based data segregation.

## What ArqCashflow Does

ArqCashflow helps architects manage their business finances through:

- **📝 Contracts**: Client agreements and project management
- **💰 Receivables**: Payment tracking and cash flow optimization
- **💸 Expenses**: Cost management and vendor payments
- **🤖 AI Assistant**: Natural language document processing and queries
- **📊 Reporting**: Excel and Google Sheets export capabilities

## 🔐 Authentication Required

This system requires authentication and implements team-based data segregation. Each team can only access their own data.

### Authentication Status:
- ✅ **User Registration/Login**: NextAuth.js with credentials provider
- ✅ **Team Creation**: Auto-creates teams during registration
- ✅ **Route Protection**: Middleware protects all pages except auth routes
- ✅ **API Security**: All APIs require authentication and filter by team
- ✅ **Data Isolation**: Secure team-based data segregation

## First Time Setup

1. **Create an Account**:
   - Visit the application URL
   - You will be redirected to `/login`
   - Click "Register" to create a new account
   - A team will be automatically created for you

2. **Team Isolation**:
   - Each user gets their own team during registration
   - Data is completely isolated between teams
   - Users can only see and manage their team's data

3. **Login**:
   - Use your email and password to login
   - Sessions are managed via JWT tokens
   - Protected routes require authentication

## 🎯 WOW Onboarding Experience

New users experience a multi-step guided setup:

### Step 1: Profile Setup
- Choose between Individual vs Company
- Tailored form fields and dropdown options
- Collects user type, profession, company activity
- Employee count and revenue tier selection

### Step 2: Data Import
- Working drag-and-drop interface with AI processing
- Support for Excel (.xlsx, .xls) and CSV files
- Intelligent data extraction and parsing
- Brazilian format handling (DD/MM/YYYY dates, R$ currency)

### Navigation Features
- Back button support and progress indicators
- Hidden navigation during onboarding to eliminate distractions
- Skip option - users can complete onboarding later
- Database-tracked completion prevents main app access until finished

## Context for LLM Agents

**Scope**: User onboarding and basic system navigation
**Prerequisites**: Understanding of financial management concepts for architects
**Key Patterns**:
- User onboarding flow
- Feature introduction sequence
- Progressive disclosure of functionality

## Quick Start

### 1. Account Creation
1. Visit [ArqCashflow](https://arqcashflow.vercel.app)
2. Click "Register" to create your account
3. Complete the onboarding process:
   - **Step 1**: Profile setup (Individual vs Company)
   - **Step 2**: Data import (optional - upload existing financial data)

### 2. Dashboard Overview
After onboarding, you'll see the main dashboard with:
- **Financial Health Indicators**: Quick status of your business
- **Key Metrics**: This month's revenue, expenses, and profit
- **Critical Alerts**: Overdue items requiring attention
- **Upcoming Items**: Next 7 days receivables and expenses

### 3. Core Features

#### 📝 Contracts (Projetos → Contratos)
Manage your client contracts and project agreements:
- Create new contracts with AI assistance
- Track contract status (active, completed, cancelled)
- Link receivables to contracts

#### 💰 Receivables (Projetos → Recebíveis)
Track expected and received payments:
- Contract-based receivables (linked to projects)
- Standalone receivables (equipment sales, refunds)
- Record actual payments with dates and amounts

#### 💸 Expenses (Projetos → Despesas)
Monitor business costs and vendor payments:
- Operational expenses (software, office supplies)
- Project expenses (materials, labor)
- Administrative expenses (accounting, legal)

## Key Workflows

### Creating Your First Contract
1. Go to **Projetos** → **Contratos**
2. Click **"🤖 Adicionar com IA"** for AI assistance
3. Type in natural language: *"Projeto João Silva, residencial, R$15k, assinado hoje"*
4. Review and confirm the extracted information

### Recording a Payment
1. Go to **Projetos** → **Recebíveis**
2. Find the pending receivable
3. Click **"Marcar como Recebido"**
4. Enter the actual payment date and amount

### Adding an Expense
1. Go to **Projetos** → **Despesas**
2. Click **"Adicionar Despesa"** or use AI assistance
3. Fill in description, amount, due date, and category
4. Link to a project if applicable

## AI Assistant Features

### Natural Language Input
The AI assistant can help you:
- Create contracts from simple descriptions
- Add expenses using conversational language
- Answer questions about your financial data

Example AI queries:
- *"Qual foi minha receita total este mês?"*
- *"Quantos contratos ativos eu tenho?"*
- *"Criar despesa: materiais Leroy Merlin, 5 mil reais, vencimento semana que vem"*

### Document Processing
Upload and process financial documents:
- Excel/CSV files with financial data
- PDF contracts and invoices
- Images of receipts and documents

## Best Practices

### Data Organization
- Use consistent client and project naming
- Set up categories that match your business
- Link expenses to projects when applicable
- Record payments promptly

### Regular Monitoring
- Check the dashboard weekly for health indicators
- Review overdue items immediately
- Update contract statuses as projects progress
- Export reports monthly for accounting

## Getting Help

### Troubleshooting
- Check the **Troubleshooting** section for common issues
- Use the AI assistant for quick questions
- Export data regularly as backups

### Advanced Features
- **Excel Export**: Generate comprehensive financial reports
- **Google Sheets Integration**: Create shareable online reports
- **Budget Management**: Set and monitor spending limits
- **Recurring Expenses**: Automate repeating costs

---

*Start with simple workflows and gradually explore advanced features as you become comfortable with the system.*