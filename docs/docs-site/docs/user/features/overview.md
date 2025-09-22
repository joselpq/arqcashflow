---
title: "ArqCashflow Features Overview"
type: "guide"
audience: ["user", "developer"]
contexts: ["features", "capabilities", "overview"]
complexity: "beginner"
last_updated: "2025-09-22"
version: "2.0"
agent_roles: ["feature-developer", "documentation-writer"]
related:
  - user/features/contracts.md
  - user/features/receivables.md
  - user/features/expenses.md
  - user/features/ai-assistant.md
dependencies: []
---

# ArqCashflow Features Overview

Comprehensive financial management system designed specifically for architects to track contracts, receivables, expenses, and analyze financial data using AI with team-based data segregation.

## Context for LLM Agents

**Scope**: Complete feature set and capabilities of ArqCashflow
**Prerequisites**: Understanding of financial management for architects
**Key Patterns**:
- Team-based data isolation pattern
- AI-assisted data entry pattern
- Multi-tenant architecture pattern

## Core Features

### 📊 Professional Dashboard
Clean, architect-focused financial overview with modern design:
- **Health Indicators**: Visual status of business health
- **Key Metrics**: Color-coded values with trend indicators
- **Cash Flow Trends**: 6-month visual analysis
- **Smart Alerts**: High-contrast overdue item notifications
- **Quick Actions**: Professional styled action buttons
- **Export Options**: Brazilian Portuguese labeled exports

### 🏗️ Unified Projetos Management
Consolidated project management with clean sub-tab navigation:

#### 📝 Contratos (Contracts)
- Complete contract management with categories
- Status tracking (active, completed, cancelled)
- Client and project name management
- Total value tracking with precision handling
- Smart duplicate detection with auto-increment

#### 💰 Recebíveis (Receivables)
Track expected and received payments:
- **Contract-based**: Traditional receivables linked to contracts
- **Standalone**: Independent receivables (sales, refunds, reimbursements)
- **Smart Status**: Automatic status based on payment info
- **Flexible Categories**: Custom categorization system
- **Precision Handling**: Accurate number handling

#### 💸 Despesas (Expenses)
Cost tracking with comprehensive management:
- Vendor and category management
- Payment status tracking
- Project expense allocation
- Recurring expense support
- Budget monitoring integration

### 🤖 AI-Powered Features

#### Enhanced AI Assistant (Claude-Powered)
Unified intelligent assistant with multiple capabilities:
- **Natural Language Queries**: Ask questions about your data
- **Smart Entity Creation**: Create contracts, expenses from text
- **Document Processing**: Direct PDF and image analysis
- **Large File Support**: PDFs up to 32MB
- **Context Awareness**: Full conversation history
- **Date Intelligence**: Portuguese date parsing ("amanhã", "em 3 dias")
- **Auto-naming**: Smart project names from client names

#### AI Setup Assistant
Advanced bulk data import with multimodal processing:
- **File Support**: Excel, CSV, PDF, images
- **Document Classification**: Identifies document types automatically
- **Proposal Intelligence**: Extracts contracts + receivables
- **Brazilian Formats**: DD/MM/YYYY dates, R$ currency
- **Status Mapping**: Portuguese → English conversion
- **Bulk Creation**: Multiple entities in one operation

#### AI Supervisor System
Intelligent data quality monitoring:
- Real-time anomaly detection
- Duplicate detection
- Value anomaly alerts
- Date inconsistency warnings
- Business rule violation detection

### 📈 Reporting & Export

#### Excel Export
Comprehensive cashflow reports with 4 detailed sheets:
- Contracts overview
- Receivables tracking
- Expenses breakdown
- Summary analysis

#### Google Sheets Export
Direct integration with Google Sheets:
- OAuth2 authentication
- Real-time sharing capabilities
- Collaborative report editing
- Cloud-based storage

### 🔐 Security & Multi-tenancy

#### Authentication System
- Secure registration/login with NextAuth.js
- JWT-based session management
- Password encryption with bcrypt
- Session validation and refresh

#### Team-based Data Segregation
- Complete data isolation per team
- Automatic team creation on registration
- Role-based access control ready
- Secure API filtering by teamId

#### Route Protection
- Middleware-based authentication
- Protected API endpoints
- Session verification
- Automatic redirects for unauthorized access

### 💼 Business Management

#### Budget Management
- Category-based budget setting
- Project budget allocation
- Spending monitoring
- Budget vs actual analysis

#### Category System
- Custom categories for all entities
- Color coding support
- Category-based filtering
- Reporting by category

#### Audit Trail System
Complete change tracking:
- Full entity change history
- User attribution for all changes
- Timestamp precision
- Field-level change tracking
- IP and context metadata

### 🎯 User Experience

#### WOW Onboarding Experience
Multi-step guided setup:
- **Profile Setup**: Individual vs company selection
- **Data Import**: Drag-and-drop with AI processing
- **Progress Tracking**: Visual progress indicators
- **Skip Options**: Complete later functionality
- **Personalized Setup**: Tailored form fields

#### Responsive Design
- Mobile-optimized interfaces
- Touch-friendly interactions
- Adaptive layouts
- Professional typography

#### Accessibility
- WCAG compliance considerations
- High contrast modes
- Keyboard navigation
- Screen reader support

### 🛠️ Technical Capabilities

#### Smart Features
- **Duplicate Detection**: Auto-increment for duplicates
- **Precision Handling**: Prevents floating-point errors
- **Smart Defaults**: Intelligent form pre-filling
- **Context Retention**: Remembers user preferences

#### Integration Ready
- RESTful API architecture
- Webhook support potential
- Third-party integration capability
- Export/import functionality

## Feature Availability by Plan

Currently, all features are available to all authenticated users. Future plans may include:
- **Free Tier**: Basic features with limits
- **Professional**: Full features for individuals
- **Team**: Multi-user collaboration
- **Enterprise**: Advanced security and compliance

## Getting Started with Features

1. **Start with Dashboard**: Get overview of financial health
2. **Add First Contract**: Use AI assistant for quick entry
3. **Track Receivables**: Monitor expected payments
4. **Manage Expenses**: Control costs effectively
5. **Generate Reports**: Export to Excel or Google Sheets

---

*For detailed guides on each feature area, explore the specific documentation in this section.*