---
title: "ADR-018: Early-Stage Organizational Structure (3-Team Model)"
type: "decision"
audience: ["leadership", "agent", "developer"]
contexts: ["organizational-design", "team-structure", "business-strategy", "incentive-alignment", "early-stage-growth"]
complexity: "intermediate"
last_updated: "2025-10-28"
version: "1.0"
agent_roles: ["org-designer", "strategy-consultant", "team-builder"]
decision_status: "accepted"
decision_date: "2025-10-28"
related:
  - decisions/008-ai-agent-strategy.md
  - decisions/017-chat-first-onboarding-redesign.md
dependencies: ["claude-api", "service-layer", "onboarding-flow"]
---

# ADR-018: Early-Stage Organizational Structure (3-Team Model)

## Context for LLM Agents

**Scope**: Defines ArqCashflow's lean organizational structure optimized for early-stage focus, with 3 core teams aligned to business-critical objectives and clear boundaries
**Prerequisites**: Understanding of AI-first product strategy, vertical market focus (architects), conversational UX differentiation
**Key Patterns**:
- Lean team structure (8-12 people total)
- Clear team boundaries and success metrics
- Aligned incentives to prevent feature bloat and ensure differentiation
- Focus over breadth at early stage

---

## Status

**Status**: Accepted
**Date**: 2025-10-28
**Decision Makers**: Leadership Team
**Context**: Early-stage company focusing on product-market fit in architect vertical

---

## Context

### Problem Statement

**Challenge**: At early stage (pre-PMF or early PMF), traditional organizational structures create misaligned incentives that lead to:
- **Feature bloat**: Teams rewarded for shipping features, not solving user problems
- **Vertical dilution**: Pressure to expand horizontally before owning one market
- **Speed loss**: Too many teams, unclear ownership, slow decision-making
- **AI gimmick risk**: AI becomes marketing checkbox rather than core differentiator

**Critical Question**: How do we structure teams to maximize our AI-first, vertical-focused differentiation while staying lean and moving fast?

### Constraints

**Business Constraints**:
- Limited funding runway (assume 12-18 months)
- Small team size (8-12 people total)
- Need rapid iteration and learning velocity
- Must establish product-market fit before scaling

**Market Constraints**:
- Competitors (QuickBooks, Xero) have massive resources and brand recognition
- Must differentiate clearly to win against incumbents
- Brazilian market requires local expertise and cultural understanding
- Architect vertical is narrow but deep opportunity

**Technical Constraints**:
- Claude API dependency for AI capabilities
- Platform must be reliable and fast for AI-first UX to work
- Onboarding flow is critical competitive advantage (5-min vs weeks)

### Requirements

**Functional Requirements**:
1. Clear ownership of growth, customer success, and AI experience
2. Aligned incentives that reinforce strategic differentiation
3. Minimal overhead and bureaucracy
4. Fast decision-making and experimentation

**Non-Functional Requirements**:
1. Team structure must be sustainable with 8-12 people
2. Success metrics must be measurable and actionable
3. Boundaries must prevent conflicting priorities
4. Culture must support speed and vertical focus

---

## Decision

### What We Decided

**Implement a 3-team organizational structure** optimized for early-stage focus and strategic differentiation:

1. **Growth & Onboarding Team** - Drive acquisition and activation
2. **Vertical Customer Success Team** - Own architect vertical market fit and retention
3. **AI Optimization Team** - Make Arnaldo the best financial assistant in the world

### Rationale

**Why 3 Teams (Not More)**:
- Minimum viable structure to cover critical business functions
- Clear ownership without overlap or gaps
- Small enough for high coordination and speed
- Scales to 12 people without becoming bureaucratic

**Why These 3 Specific Teams**:
1. **Growth & Onboarding**: If users can't discover, try, or activate → we have no business
2. **Vertical Success**: If architects don't love us and refer peers → we have no moat
3. **AI Optimization**: If Arnaldo isn't magical → we're just another accounting tool

**Key Design Principles**:
- Teams aligned to business outcomes, not functions
- Success metrics that reinforce differentiation
- Clear boundaries to prevent scope creep
- Shared responsibility for product quality and user happiness

---

## Team Structures

### **Team 1: Growth & Onboarding Team** 📈

**Mission**: Get users from "curious" to "can't live without this" in 5 minutes

**Team Size**: 2-4 people

**Team Composition**:
- **Growth Product Manager** (1)
- **Full-Stack Growth Engineer** (1-2)
- **Marketing/Content Specialist** (1) - Optional initially, can be shared role

**Core Responsibilities**:

1. **Acquisition**:
   - Landing page optimization and A/B testing
   - Content marketing (SEO, blog posts like "Guia Financeiro para Arquitetos")
   - Paid acquisition channels (Google Ads, Instagram for architects)
   - Partnership development (architecture associations, schools)

2. **Activation**:
   - Onboarding flow optimization (protect the 5-minute advantage)
   - File upload experience (multi-file, Excel, contracts, PDFs)
   - First-time user education (Arnaldo introduction, capability discovery)
   - Setup Assistant reliability and accuracy

3. **Experimentation**:
   - Rapid A/B testing (minimum 2 experiments per week)
   - Conversion funnel analysis and optimization
   - Viral loops and referral mechanisms
   - Pricing and packaging tests

**Success Metrics**:

**North Star**: **Activation Rate** (% of signups who complete onboarding + add first data)
- Current baseline: ~85% (from ADR-017)
- Target: 90%+ activation rate
- Target: 60%+ use Arnaldo in first month

**Secondary Metrics**:
- Time to first value (currently ~5 min, target `<3 min`)
- Week 1 retention rate (target: 70%+)
- Organic traffic growth (MoM increase)
- Cost per activated user (CAC efficiency)
- Viral coefficient (referrals per activated user)

**Aligned Incentives**:
- ✅ **Bonus tied to Week 1 retention** (not just signups or trials)
- ✅ Experiments run per week (velocity of learning)
- ✅ Time-to-first-value improvements
- ❌ **Anti-pattern**: Raw signup numbers (leads to low-quality users)
- ❌ **Anti-pattern**: Feature launches without impact data

**Team Boundaries**:

**IN SCOPE**:
- Landing page design, copy, and optimization
- Onboarding flow (everything before dashboard)
- File upload and Setup Assistant user experience
- Marketing website and content
- Analytics and experimentation infrastructure
- Pricing page and plan selection

**OUT OF SCOPE**:
- Dashboard features and post-onboarding UX (Vertical Success owns)
- AI accuracy and latency (AI Optimization owns)
- Long-term customer retention programs (Vertical Success owns)
- Product roadmap prioritization (collaborative decision)

**Decision Authority**:
- **Full authority**: Landing page changes, onboarding A/B tests, marketing content
- **Collaborative**: Pricing changes, major onboarding redesigns, vertical expansion
- **Consultation**: AI feature requests, dashboard improvements

---

### **Team 2: Vertical Customer Success Team** 🎯

**Mission**: Make ArqCashflow the only financial platform architects recommend to peers

**Team Size**: 2-3 people

**Team Composition**:
- **Vertical Product Manager** (1) - Ideally ex-architect or deep industry expertise
- **Customer Success Specialist** (1-2) - Onboarding support, relationship building, churn prevention

**Core Responsibilities**:

1. **Customer Success**:
   - Proactive user onboarding and support (white-glove for early users)
   - Usage monitoring and intervention (identify users at risk of churn)
   - Success playbooks (help users get value from platform)
   - Feature education (ensure users discover Arnaldo, advanced features)

2. **Vertical Intelligence**:
   - Deep understanding of architect business models and pain points
   - User research and feedback collection (monthly roundtables)
   - Competitive intelligence (what do architects use today? why?)
   - Industry relationship building (CAU, architecture associations, schools)

3. **Product Development**:
   - Architect-specific feature prioritization
   - Dashboard and reporting optimization
   - Workflow improvements based on user feedback
   - Integration opportunities (CAD software, construction management tools)

4. **Retention & Expansion**:
   - Churn prevention and recovery
   - Upsell and cross-sell to advanced features
   - Case study and testimonial development
   - Referral program execution

**Success Metrics**:

**North Star**: **Net Revenue Retention (NRR)** in architect vertical
- Target: 120%+ NRR (users stay, upgrade, refer peers)
- Formula: (Starting ARR + Expansion - Churn) / Starting ARR

**Secondary Metrics**:
- Monthly Active Users (MAU) percentage (target: 80%+ of paid users)
- Churn rate (target: `<5%` monthly)
- User-generated referrals (target: 30%+ of new users from referrals)
- NPS score among architects (target: 50+)
- Industry-specific feature adoption rate
- Case studies published (target: 2 per quarter)

**Aligned Incentives**:
- ✅ **Bonus tied to NRR** (expansion + retention combined)
- ✅ Referral rate from existing users
- ✅ Qualitative success: testimonials, word-of-mouth, social proof
- ✅ Proactive churn prevention (intervention success rate)
- ❌ **Anti-pattern**: New feature count (leads to bloat)
- ❌ **Anti-pattern**: Expanding to new verticals prematurely (dilutes focus)

**Team Boundaries**:

**IN SCOPE**:
- Post-onboarding user experience and dashboard
- All architect-specific features and workflows
- Customer support and success programs
- User research and feedback loops
- Product roadmap input (vertical perspective)
- Retention and expansion strategies
- Industry partnerships and relationships

**OUT OF SCOPE**:
- Landing page and pre-signup marketing (Growth owns)
- Onboarding flow before dashboard (Growth owns)
- AI latency, accuracy, tone (AI Optimization owns)
- Technical infrastructure decisions (collaborative)

**Decision Authority**:
- **Full authority**: Customer success processes, support responses, user education content
- **Collaborative**: Product roadmap, vertical expansion timing, pricing for enterprise
- **Veto power**: Feature bloat that dilutes vertical focus (can say "this isn't for architects")

---

### **Team 3: AI Optimization Team** 🤖

**Mission**: Make Arnaldo the fastest, smartest, most delightful financial assistant users have ever experienced

**Team Size**: 2-4 people

**Team Composition**:
- **AI Product Lead** (1) - Owns conversational UX strategy
- **LLM Engineer / Prompt Engineer** (1-2) - Claude API optimization, context management
- **Conversational Designer** (0.5-1) - Can be shared initially, owns tone, personality, edge cases

**Core Responsibilities**:

1. **Conversational Experience**:
   - Arnaldo's personality, tone of voice, and Brazilian Portuguese fluency
   - Conversation flow design (guided vs open-ended)
   - Edge case handling (ambiguous requests, errors, clarifications)
   - Chat UI/UX optimization (typing indicators, loading states, message formatting)

2. **AI Performance**:
   - Response latency optimization (target: `<2s` median)
   - Claude API cost reduction (token usage optimization)
   - Accuracy improvements (contract extraction, expense creation, query responses)
   - Context management (conversation history, user preferences, business data)

3. **Agent Development**:
   - Setup Assistant reliability and accuracy (100% extraction target)
   - Financial Query Agent optimization (text-to-SQL, semantic understanding)
   - Operations Agent improvements (natural language CRUD commands)
   - Unified AI Router intent classification

4. **AI Infrastructure**:
   - Prompt engineering and version control
   - Claude API integration and monitoring
   - Fallback strategies (API failures, rate limits)
   - A/B testing framework for prompts and models

**Success Metrics**:

**North Star**: **% of user tasks completed via Arnaldo** (vs manual UI)
- Current baseline: ~40% (estimated)
- Target: 70%+ by Month 6
- Ultimate goal: 80%+ (AI-first becomes default behavior)

**Secondary Metrics**:
- Arnaldo response latency (median and p95, target: `<2s` median, `<5s` p95)
- Claude API cost per active user (target: 25% reduction quarter-over-quarter)
- Task completion rate via chat (target: 85%+ successful completions)
- User satisfaction with AI responses (thumbs up/down, target: 80%+ positive)
- Setup Assistant extraction accuracy (target: 100% for supported file types)
- Conversation abandonment rate (target: `<15%`)

**Aligned Incentives**:
- ✅ **Bonus tied to chat usage rate** (% of tasks via Arnaldo)
- ✅ Latency improvements (faster response times)
- ✅ Cost efficiency (lower API costs without sacrificing quality)
- ✅ User testimonials mentioning "AI" or "Arnaldo"
- ❌ **Anti-pattern**: Number of AI features shipped (quality over quantity)
- ❌ **Anti-pattern**: Using cheapest models (optimize for experience, not cost)

**Team Boundaries**:

**IN SCOPE**:
- All AI agent development and optimization
- Conversational UX and chat interface
- Prompt engineering and model selection
- Claude API integration and performance
- AI-related analytics and monitoring
- Setup Assistant accuracy and reliability

**OUT OF SCOPE**:
- Landing page and marketing content (Growth owns)
- Dashboard UI and manual workflows (Vertical Success owns)
- Business logic and service layer (shared responsibility)
- Product roadmap prioritization (collaborative)

**Decision Authority**:
- **Full authority**: Prompt changes, model selection, AI UX improvements
- **Collaborative**: New agent development, major architecture changes
- **Consultation**: Feature requests that require AI integration

---

## Cross-Team Collaboration

### **Shared Responsibilities**:

1. **Product Quality**: All teams own user experience and platform reliability
2. **Analytics**: All teams contribute to instrumentation and data collection
3. **Documentation**: All teams document their work for future team members and LLM agents
4. **User Feedback**: All teams participate in user research and feedback loops

### **Decision-Making Framework**:

**Autonomous Decisions** (No approval needed):
- Team-specific optimizations and experiments
- Internal processes and workflows
- Tactical execution details

**Collaborative Decisions** (Requires discussion):
- Product roadmap prioritization
- Major UX changes that affect multiple teams
- Pricing and packaging changes
- New vertical or market expansion
- Significant technical architecture changes

**Leadership Decisions** (Requires leadership approval):
- Budget allocation and hiring
- Strategic pivots or major strategy changes
- Partnership agreements
- Funding and investment decisions

### **Communication Cadence**:

**Daily**:
- Async updates in shared Slack channels
- Quick questions and unblocking

**Weekly**:
- All-hands meeting (30 minutes): Metrics review, wins, blockers
- Team standups (15 minutes): Progress, plans, help needed

**Bi-Weekly**:
- Product sync (60 minutes): Roadmap, prioritization, cross-team alignment

**Monthly**:
- Metrics deep-dive (90 minutes): Review North Star metrics, adjust strategies
- Retrospective (60 minutes): What's working, what's not, process improvements

---

## Alternatives Considered

### Option 1: Traditional Functional Teams (Engineering, Product, Marketing)

- **Description**: Organize by function rather than business outcome
- **Pros**: Clear career paths, easy to understand, industry standard
- **Cons**: Misaligned incentives, slower decision-making, silo mentality, doesn't reinforce strategic differentiation
- **Why Not Chosen**: At early stage, we need teams aligned to business outcomes, not org chart simplicity

### Option 2: Single Unified Product Team

- **Description**: Everyone works on everything, no team boundaries
- **Pros**: Maximum flexibility, no silos, easy communication
- **Cons**: Unclear ownership, conflicting priorities, no specialized expertise, hard to scale beyond 5-6 people
- **Why Not Chosen**: Too chaotic for 8-12 people, need clear ownership and accountability

### Option 3: 5+ Specialized Teams (AI, Growth, Success, Platform, Data)

- **Description**: More granular team structure with dedicated platform/data teams
- **Pros**: Clear specialization, scalable structure
- **Cons**: Too much overhead for early stage, slow decision-making, artificial boundaries
- **Why Not Chosen**: Over-engineering for current size; can add teams later as we scale

### Option 4: Hire Agencies/Contractors Instead of Teams

- **Description**: Outsource functions like marketing, customer support, AI development
- **Pros**: Lower fixed costs, access to specialized expertise
- **Cons**: No institutional knowledge, misaligned incentives, slower feedback loops, quality inconsistency
- **Why Not Chosen**: Our differentiation requires deep expertise and fast iteration that agencies can't provide

---

## Implementation

### Phase 1: Team Formation (Weeks 1-4)

**Week 1-2: Define Roles and Hire**
- Write detailed job descriptions for each role
- Identify ideal candidates (internal promotion + external hiring)
- Define compensation and equity packages
- Launch recruiting process

**Week 3-4: Onboarding and Alignment**
- Team kickoff meetings (mission, metrics, boundaries)
- Set up communication channels and tools
- Define initial OKRs for each team
- Establish weekly/monthly meeting cadence

### Phase 2: Establish Metrics and Dashboards (Weeks 5-6)

**Data Infrastructure**:
- Set up analytics tracking for all North Star metrics
- Create team dashboards (public visibility)
- Define data collection requirements
- Implement A/B testing framework (Growth team)

**Success Criteria**:
- Each team can see their North Star metric in real-time
- Weekly metrics reviews are automated
- Teams have access to user feedback and research data

### Phase 3: Run First Quarter (Weeks 7-18)

**Growth & Onboarding Team**:
- Launch 8+ A/B tests on onboarding flow
- Publish 4+ SEO content pieces targeting architects
- Achieve 90%+ activation rate
- Reduce time-to-first-value to `<3` minutes

**Vertical Customer Success Team**:
- Conduct 3+ architect roundtables
- Publish 2+ case studies
- Achieve `<5%` monthly churn rate
- Launch referral program

**AI Optimization Team**:
- Reduce median Arnaldo latency to `<2s`
- Reduce Claude API cost per user by 25%
- Achieve 100% Setup Assistant accuracy
- Increase chat usage to 60%+ of tasks

### Phase 4: Review and Iterate (Week 19-20)

**Quarterly Review**:
- Evaluate North Star metrics vs targets
- Identify bottlenecks and misalignments
- Adjust team composition if needed
- Plan next quarter OKRs

**Potential Adjustments**:
- Add platform/infrastructure role if reliability becomes bottleneck
- Split teams if any team exceeds 5 people
- Rebalance responsibilities based on learnings

---

## Consequences

### Positive Consequences

**Aligned Incentives**:
- ✅ Teams rewarded for outcomes that reinforce differentiation
- ✅ Growth team can't game metrics with low-quality signups (Week 1 retention)
- ✅ Vertical team prevents feature bloat (veto power)
- ✅ AI team optimizes for experience, not just cost

**Speed and Focus**:
- ✅ Clear ownership enables fast decision-making
- ✅ Small teams (2-4 people) maintain high velocity
- ✅ Vertical focus prevents horizontal dilution
- ✅ Lean structure minimizes bureaucracy and meetings

**Strategic Differentiation**:
- ✅ AI-first culture embedded in org structure (dedicated AI team)
- ✅ Vertical obsession enforced by Customer Success team
- ✅ Onboarding advantage protected by Growth team

**Scalability**:
- ✅ Structure can scale to 20-30 people by adding sub-teams
- ✅ Clear boundaries make it easy to add new roles
- ✅ Success metrics provide feedback for when to split teams

### Negative Consequences

**Potential Gaps**:
- ⚠️ No dedicated platform/infrastructure team (risk: technical debt accumulates)
- ⚠️ No dedicated data/analytics team (risk: insights move slower)
- ⚠️ No dedicated design team (risk: UX inconsistency)

**Mitigation**:
- Platform work shared across teams (AI Optimization owns backend, Growth owns frontend)
- Data work embedded in each team (Growth PM, AI Lead, CS Specialist)
- Design work contracted or part-time initially, hire full-time designer at 15+ people

**Coordination Overhead**:
- ⚠️ Cross-team features require more communication
- ⚠️ Shared codebase needs clear ownership conventions
- ⚠️ Product roadmap requires collaborative prioritization

**Mitigation**:
- Weekly product sync for cross-team alignment
- Clear decision-making framework (autonomous vs collaborative)
- Shared responsibility for product quality and user experience

**Hiring Challenges**:
- ⚠️ Small teams mean each hire is critical
- ⚠️ Need generalists who can wear multiple hats
- ⚠️ Hard to compete with big tech for specialized talent

**Mitigation**:
- Offer equity and autonomy (appeal to builders)
- Target mission-driven candidates who believe in SMB empowerment
- Prioritize learning and growth opportunities

### Risks and Mitigation

**Risk 1: Team Imbalance**
- **Impact**: One team becomes bottleneck (e.g., AI team overwhelmed)
- **Probability**: Medium
- **Mitigation**:
  - Monitor team velocity and burnout signals
  - Flexible hiring budget to rebalance
  - Cross-training to enable temporary help

**Risk 2: Misaligned Metrics**
- **Impact**: Teams optimize for their metrics but hurt overall business
- **Probability**: Low-Medium
- **Mitigation**:
  - Company-wide OKRs that teams contribute to
  - Monthly review of metric alignment
  - Shared responsibility for user happiness and product quality

**Risk 3: Vertical Team Becomes Feature Factory**
- **Impact**: Pressure to ship features dilutes focus
- **Probability**: Medium
- **Mitigation**:
  - NRR metric rewards retention over features
  - Veto power on feature bloat
  - Quarterly review: "Did we say no enough?"

**Risk 4: Growth Team Optimizes for Wrong Users**
- **Impact**: Acquire users who aren't good fit (not architects, don't have data)
- **Probability**: Medium
- **Mitigation**:
  - Week 1 retention metric (not just activation)
  - Segment analysis (architect vs non-architect retention)
  - Close collaboration with Vertical Success team

---

## Validation

### Success Criteria

**Quarter 1 (Months 0-3)**:
- ✅ All 3 teams staffed and operational
- ✅ North Star metrics tracked in real-time dashboards
- ✅ Weekly all-hands and team standups established
- ✅ First quarterly OKR review completed

**Quarter 2 (Months 3-6)**:
- ✅ Growth Team: 90%+ activation rate, 60%+ Arnaldo usage in Month 1
- ✅ Vertical Team: `<5%` churn, 2+ case studies, referral program launched
- ✅ AI Team: `<2s` median latency, 70%+ tasks via Arnaldo, 100% extraction accuracy

**Quarter 3-4 (Months 6-12)**:
- ✅ Company-wide: 120%+ NRR, 500+ activated architect users
- ✅ 30%+ of new users from organic referrals
- ✅ NPS ≥ 50 among architects
- ✅ Clear product-market fit indicators

**Long-Term (12+ months)**:
- ✅ Structure scales to 20-30 people by adding sub-teams
- ✅ Teams maintain autonomy and velocity as company grows
- ✅ Strategic differentiation (AI-first, vertical-focused) remains intact

### Review Schedule

**Weekly**: Team-specific metric reviews in standups
**Monthly**: All-hands metrics deep-dive and strategy adjustments
**Quarterly**: Comprehensive OKR review and team structure evaluation
**Annually**: Full organizational design review and scaling plan

**Triggers for Re-evaluation**:
- Team size exceeds 5 people (consider splitting)
- North Star metric stagnates for 2+ months
- Major strategic pivot (new vertical, new product)
- Funding round (Series A) enables scaling

---

## References

### Related Decisions
- [ADR-008: AI Agent Strategy](./008-ai-agent-strategy.md) - Defines AI capabilities and agents
- [ADR-017: Chat-First Onboarding Redesign](./017-chat-first-onboarding-redesign.md) - Onboarding strategy this org structure supports

### External Resources
- **Organizational Design**:
  - "High Output Management" by Andy Grove (team structure principles)
  - "Team Topologies" by Matthew Skelton (team boundaries and interactions)
  - First Round Review: "How to Structure Your Startup as Employee #1-50"

- **Early-Stage Strategy**:
  - Y Combinator: "Do Things That Don't Scale" by Paul Graham
  - Elad Gil: "High Growth Handbook" (scaling organizations)
  - Lenny's Newsletter: "How the best product teams structure themselves"

- **Competitive Benchmarks**:
  - QuickBooks/Intuit organizational structure (what to avoid at early stage)
  - AI-first company case studies (Jasper, Copy.ai, Notion AI)
  - Vertical SaaS playbooks (Procore, Veeva, Toast)

### Implementation Details
- Team charter templates (mission, metrics, boundaries)
- Job description templates for each role
- OKR framework and examples
- Metrics dashboard specifications

---

**Last Updated**: 2025-10-28
**Version**: 1.0
**Status**: Accepted

**Key Takeaway**: At early stage, less is more. Three focused teams aligned to business-critical outcomes (acquisition, retention, AI excellence) provide the minimum viable structure to execute with speed while reinforcing strategic differentiation. This structure is designed to scale thoughtfully as the company grows, adding teams only when clear bottlenecks emerge.

*This ADR documents the organizational foundation that will enable ArqCashflow to achieve product-market fit in the architect vertical through aligned incentives, clear ownership, and strategic focus.*
