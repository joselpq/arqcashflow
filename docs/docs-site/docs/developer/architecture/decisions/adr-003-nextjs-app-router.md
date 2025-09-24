---
title: "ADR-003: Next.js 15 with App Router Architecture"
type: "decision"
audience: ["developer", "agent"]
contexts: ["architecture", "frontend", "fullstack"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["frontend-architect", "fullstack-developer"]
decision_status: "accepted"
decision_date: "2024-12-10"
related:
  - developer/architecture/overview.md
  - agents/patterns/testing-strategies.md
dependencies: ["next", "react", "typescript"]
---

# ADR-003: Next.js 15 with App Router Architecture

## Context for LLM Agents

**Scope**: This ADR covers the decision to use Next.js 15 with the App Router as the foundation for ArqCashflow's full-stack architecture
**Prerequisites**: Understanding of React, Next.js, server-side rendering, and full-stack development
**Key Patterns**:
- App Router file-based routing with layout hierarchy
- Server and Client Components with RSC (React Server Components)
- API Routes co-located with frontend code
- TypeScript-first development with strict type safety
- Middleware for authentication and team context

## Status

**Status**: Accepted
**Date**: 2024-12-10
**Decision Makers**: Frontend Team, Full-stack Architects
**Supersedes**: N/A (initial framework decision)

## Context

### Problem Statement
ArqCashflow needed a modern, full-stack web framework that could:
- Handle complex financial dashboards with excellent performance
- Provide server-side rendering for SEO and initial load speed
- Support API development alongside frontend code
- Enable type-safe development across the stack
- Scale efficiently for multiple architectural firms
- Support advanced features like AI integration and file processing

### Constraints
- **Performance**: Financial dashboards require fast rendering and responsive interactions
- **SEO Requirements**: Marketing pages need server-side rendering for search visibility
- **Development Speed**: Small team requires productive development experience
- **Type Safety**: Financial applications demand strict type checking
- **Deployment**: Must work well with Vercel's edge computing platform
- **Team Experience**: Team familiar with React ecosystem

### Requirements
- **Functional Requirements**:
  - Server-side rendering for marketing and SEO pages
  - Client-side interactivity for financial dashboards
  - API endpoints for data operations and AI integration
  - File upload handling for documents up to 32MB
  - Authentication and authorization middleware
  - Real-time updates for financial data
- **Non-functional Requirements**:
  - Initial page load under 2 seconds
  - Smooth interactions with optimistic updates
  - Type safety across frontend and API layers
  - Developer experience with hot reloading and debugging
  - Production build optimization

## Decision

### What We Decided
Adopt Next.js 15 with App Router as the full-stack foundation:
1. **App Router**: File-based routing with enhanced layout and loading states
2. **React Server Components**: Server-side rendering with streaming
3. **API Routes**: Co-located API endpoints with edge runtime support
4. **TypeScript Integration**: Strict type checking across the stack
5. **Middleware**: Authentication and team context injection
6. **Turbopack**: Enhanced build performance for development

### Rationale
- **Performance**: RSC and streaming provide excellent performance for financial dashboards
- **Developer Experience**: Integrated full-stack development with type safety
- **Ecosystem**: Rich ecosystem with excellent library support
- **Deployment**: Optimized for Vercel's edge computing platform
- **Future-Ready**: App Router represents the future of Next.js development
- **Team Productivity**: Familiar React patterns with enhanced capabilities

## Alternatives Considered

### Option 1: Remix with React Router
- **Description**: Use Remix framework with React Router for full-stack development
- **Pros**: Excellent form handling, progressive enhancement, web standards focus
- **Cons**: Smaller ecosystem, less mature deployment options, learning curve
- **Why Not Chosen**: Team familiarity with Next.js and Vercel deployment advantages

### Option 2: Separate Frontend (React/Vite) + Backend (Node.js/Express)
- **Description**: Traditional separation with React SPA and Express API server
- **Pros**: Clear separation of concerns, flexibility in deployment
- **Cons**: More complex setup, separate type systems, deployment complexity
- **Why Not Chosen**: Full-stack integration benefits outweighed separation advantages

### Option 3: SvelteKit
- **Description**: Use Svelte's full-stack framework for modern web development
- **Pros**: Excellent performance, smaller bundle sizes, modern developer experience
- **Cons**: Smaller ecosystem, team learning curve, fewer resources available
- **Why Not Chosen**: Team expertise and ecosystem maturity favored React/Next.js

### Option 4: Next.js 14 with Pages Router
- **Description**: Use the traditional Pages Router instead of App Router
- **Pros**: Mature, well-documented, existing team knowledge
- **Cons**: Missing modern features, layout limitations, API route constraints
- **Why Not Chosen**: App Router's advantages (layouts, streaming, RSC) were compelling

## Implementation

### What Changes
- **Project Structure**: App Router file-based organization with route groups
- **Component Architecture**: Mix of Server and Client Components
- **API Layer**: Edge runtime API routes with Zod validation
- **Authentication**: Middleware-based authentication with NextAuth.js
- **Styling**: Tailwind CSS with component patterns
- **Build System**: Turbopack for development, webpack for production

### Migration Strategy
1. **Initial Setup**: New project with Next.js 15 and App Router
2. **Core Pages**: Implement authentication and main dashboard layouts
3. **API Routes**: Develop RESTful endpoints with proper error handling
4. **Client Interactivity**: Add Client Components for interactive features
5. **Performance Optimization**: Implement streaming and loading states
6. **Testing**: Set up testing infrastructure for full-stack application

### Timeline
- **Week 1**: Project setup and basic routing structure
- **Week 2**: Authentication flow and protected routes
- **Week 3**: Core dashboard components and API integration
- **Week 4**: Performance optimization and production deployment

## Consequences

### Positive Consequences
- **Performance**: Excellent initial load times with RSC and streaming
- **Developer Experience**: Integrated development with type safety and hot reloading
- **SEO Capabilities**: Server-side rendering for marketing and public pages
- **Deployment**: Seamless deployment to Vercel's edge network
- **Ecosystem**: Access to vast React and Next.js ecosystem
- **Future-Proof**: Built on modern React features and web standards

### Negative Consequences
- **Learning Curve**: App Router differences from Pages Router
- **Complexity**: Full-stack integration can blur architectural boundaries
- **Bundle Size**: React and Next.js add baseline bundle weight
- **Vendor Lock-in**: Some features optimized for Vercel deployment
- **Migration Path**: Future changes to App Router API may require updates

### Risks and Mitigation
- **Risk**: App Router API changes in future Next.js versions
  - **Mitigation**: Follow Next.js upgrade guides, maintain comprehensive tests
- **Risk**: Performance issues with complex client-side interactions
  - **Mitigation**: Proper Client/Server Component boundaries, performance monitoring
- **Risk**: SEO issues with client-side navigation
  - **Mitigation**: Proper metadata management, server-side rendering for critical paths
- **Risk**: Complex state management across server/client boundaries
  - **Mitigation**: Clear patterns for data fetching and state management

## Validation

### Success Criteria
- **Performance**: Lighthouse scores above 90 for all metrics on key pages
- **Development Speed**: New feature development 30% faster than traditional approaches
- **Type Safety**: Zero runtime type errors in production
- **SEO**: Marketing pages achieve target search ranking within 6 months
- **User Experience**: Dashboard interactions feel instant with optimistic updates

### Review Schedule
- **Quarterly**: Performance review and optimization opportunities
- **Annually**: Framework version updates and architectural improvements
- **Trigger Events**: Major Next.js releases, performance degradation, team feedback

## References

### Related Decisions
- [Team-based Data Isolation](./adr-001-team-based-isolation.md): How middleware enforces security
- [Testing Strategies](../../agents/patterns/testing-strategies.md): Full-stack testing patterns

### External Resources
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023)
- [Next.js Performance Best Practices](https://nextjs.org/docs/pages/building-your-application/optimizing/performance)

### Implementation Details
- Application structure: `app/` directory with route groups
- Component patterns: `components/` with Server/Client separation
- API routes: `app/api/*/route.ts` with edge runtime
- Middleware: `middleware.ts` for authentication and routing

---

*This ADR establishes Next.js 15 with App Router as the foundation for modern, performant full-stack development in ArqCashflow.*