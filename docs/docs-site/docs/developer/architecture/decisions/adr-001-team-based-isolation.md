---
title: "ADR-001: Team-based Data Isolation Architecture"
type: "decision"
audience: ["developer", "agent"]
contexts: ["architecture", "security", "multi-tenant"]
complexity: "advanced"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["architecture-reviewer", "security-analyst"]
decision_status: "accepted"
decision_date: "2024-12-15"
related:
  - developer/architecture/overview.md
  - developer/architecture/database.md
dependencies: ["prisma", "next-auth"]
---

# ADR-001: Team-based Data Isolation Architecture

## Context for LLM Agents

**Scope**: This ADR covers the fundamental security architecture decision for complete multi-tenant data isolation
**Prerequisites**: Understanding of multi-tenant systems, database security, and Next.js middleware
**Key Patterns**:
- Database-first team isolation at ORM level
- Middleware-enforced authentication and team context
- API route security patterns with automatic team filtering
- Zero-trust data access with explicit team validation

## Status

**Status**: Accepted
**Date**: 2024-12-15
**Decision Makers**: Core development team
**Supersedes**: N/A (initial architecture decision)

## Context

### Problem Statement
ArqCashflow is a financial management system that needs to serve multiple architectural firms while ensuring complete data isolation between teams. Financial data is highly sensitive and requires absolute separation - no team should ever be able to access another team's contracts, receivables, expenses, or any other business data.

### Constraints
- **Security Requirements**: Complete data isolation for financial information
- **Compliance**: Brazilian financial data protection requirements
- **Performance**: Must not significantly impact query performance
- **Development Experience**: Should be transparent to developers (security by default)
- **Scalability**: Must work efficiently as the number of teams grows

### Requirements
- **Functional Requirements**:
  - Complete data segregation between teams
  - Automatic team context injection in all queries
  - Authentication-based team assignment
  - Audit trail preservation per team
- **Non-functional Requirements**:
  - Zero data leakage between teams
  - Minimal performance overhead
  - Developer-friendly implementation
  - Scalable to hundreds of teams

## Decision

### What We Decided
Implement complete team-based data isolation using:
1. **Database Schema**: Every data table includes a `teamId` foreign key
2. **ORM Level Filtering**: All Prisma queries automatically include team filtering
3. **Middleware Enforcement**: Next.js middleware validates authentication and injects team context
4. **API Security**: All API routes filter by authenticated user's team ID

### Rationale
- **Security First**: Financial data requires absolute isolation
- **Database-First**: Ensures isolation at the lowest level (data layer)
- **Performance**: Team filtering at query level is more efficient than application-level filtering
- **Developer Safety**: Makes it impossible to accidentally create cross-team queries
- **Audit Compliance**: Team context preserved in all operations

## Alternatives Considered

### Option 1: Application-Level Filtering
- **Description**: Filter data in application code after retrieval from database
- **Pros**: Simpler database schema, easier to implement initially
- **Cons**: Higher security risk, potential for data leakage, performance overhead
- **Why Not Chosen**: Too risky for financial data, performance concerns with large datasets

### Option 2: Separate Databases Per Team
- **Description**: Each team gets their own database instance
- **Pros**: Complete physical isolation, easier backup/restore per team
- **Cons**: Complex deployment, expensive infrastructure, difficult cross-team analytics
- **Why Not Chosen**: Over-engineered for current scale, operational complexity

### Option 3: Row-Level Security (RLS)
- **Description**: Use PostgreSQL's built-in row-level security policies
- **Pros**: Database-native security, very robust
- **Cons**: Complex policy management, limited portability, harder to debug
- **Why Not Chosen**: Adds database-specific complexity, harder to test and validate

## Implementation

### What Changes
- **Database Schema**: All tables include `teamId` field with foreign key constraints
- **Prisma Models**: Team relationships defined in schema.prisma
- **Middleware**: Authentication and team context injection in middleware.ts
- **API Routes**: Standardized team filtering pattern in all endpoints
- **Type System**: TypeScript interfaces include team context

### Migration Strategy
1. Add `teamId` field to all existing tables
2. Create Team model with proper relationships
3. Implement middleware for team context injection
4. Update all API routes to include team filtering
5. Add validation tests for team isolation

### Timeline
- **Week 1**: Database schema updates and migrations
- **Week 2**: Middleware implementation and API route updates
- **Week 3**: Testing and validation of team isolation
- **Week 4**: Documentation and training

## Consequences

### Positive Consequences
- **Complete Security**: Zero risk of cross-team data access
- **Performance**: Efficient queries with team-based indexing
- **Developer Experience**: Security by default, impossible to create insecure queries
- **Compliance**: Meets financial data protection requirements
- **Scalability**: Efficient scaling as team count grows

### Negative Consequences
- **Schema Complexity**: Every table must include team relationships
- **Migration Overhead**: All existing data must be assigned to teams
- **Query Constraints**: Cross-team analytics require special handling
- **Testing Complexity**: All tests must include team context

### Risks and Mitigation
- **Risk**: Performance degradation with many teams
  - **Mitigation**: Strategic indexing on (teamId, otherColumns) composite indexes
- **Risk**: Development errors bypassing team filtering
  - **Mitigation**: Comprehensive test suite validating team isolation
- **Risk**: Complex data relationships across teams
  - **Mitigation**: Clear documentation of when cross-team access is needed and how to handle it

## Validation

### Success Criteria
- **Security Validation**: Penetration testing confirms no cross-team data access
- **Performance Metrics**: Query performance remains under 100ms for typical operations
- **Developer Metrics**: Zero security incidents related to team data leakage
- **Compliance**: Passes financial data protection audits

### Review Schedule
- **Quarterly**: Security review and penetration testing
- **Annually**: Architecture review for scalability and performance
- **Trigger Events**: Any security incident, major performance degradation, compliance requirement changes

## References

### Related Decisions
- [Database Schema Design](../database.md): Complete schema documentation
- [API Development Patterns](../../../agents/contexts/api-development.md): Team-aware API patterns

### External Resources
- [Multi-tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/overview)
- [Database Security Best Practices](https://www.owasp.org/index.php/Database_Security_Cheat_Sheet)
- [Prisma Multi-tenancy Guide](https://www.prisma.io/docs/guides/general/multi-tenancy)

### Implementation Details
- Database migrations: `prisma/migrations/`
- Middleware implementation: `middleware.ts`
- API patterns: `app/api/*/route.ts`

---

*This ADR establishes the foundation for secure multi-tenant operations in ArqCashflow, ensuring complete data isolation for financial information.*