---
title: "ADR-XXX: Decision Title"
type: "decision"
audience: ["developer", "agent"]
contexts: ["architecture", "technical-decisions"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["architecture-reviewer", "technical-investigator"]
decision_status: "proposed|accepted|rejected|superseded"
decision_date: "2025-09-22"
related:
  - meta/templates/document-template.md
dependencies: []
---

# ADR-XXX: Decision Title

## Context for LLM Agents

**Scope**: This ADR covers the decision about [specific technical choice/architecture/approach]
**Prerequisites**: Understanding of [relevant technologies/concepts]
**Key Patterns**:
- Decision documentation pattern
- Technical investigation methodology
- Context preservation for future reference

## Status

**Status**: [Proposed | Accepted | Rejected | Superseded]
**Date**: YYYY-MM-DD
**Decision Makers**: [Who made this decision]
**Supersedes**: [Link to previous ADR if applicable]

## Context

### Problem Statement
What problem were we trying to solve? What was the situation that required a decision?

### Constraints
- Technical constraints (existing systems, performance requirements, etc.)
- Business constraints (timeline, budget, team expertise, etc.)
- Organizational constraints (company policies, compliance requirements, etc.)

### Requirements
- Functional requirements the solution must meet
- Non-functional requirements (performance, security, maintainability, etc.)
- Future requirements to consider

## Decision

### What We Decided
Clear statement of the decision made.

### Rationale
Why did we make this decision? What were the key factors that led to this choice?

## Alternatives Considered

### Option 1: [Alternative Name]
- **Description**: What this option involved
- **Pros**: Benefits of this approach
- **Cons**: Drawbacks or limitations
- **Why Not Chosen**: Specific reasons for rejection

### Option 2: [Alternative Name]
- **Description**: What this option involved
- **Pros**: Benefits of this approach
- **Cons**: Drawbacks or limitations
- **Why Not Chosen**: Specific reasons for rejection

### Option 3: [Alternative Name]
- **Description**: What this option involved
- **Pros**: Benefits of this approach
- **Cons**: Drawbacks or limitations
- **Why Not Chosen**: Specific reasons for rejection

## Implementation

### What Changes
- Code changes required
- Configuration changes
- Process changes
- Documentation updates

### Migration Strategy
If applicable, how to migrate from the old approach to the new one.

### Timeline
Key milestones and dates for implementation.

## Consequences

### Positive Consequences
- Benefits we expect to gain
- Problems this decision solves
- Improvements to the system/process

### Negative Consequences
- Trade-offs we're accepting
- New problems this might create
- Technical debt incurred

### Risks and Mitigation
- Identified risks with the decision
- How we plan to mitigate those risks
- Monitoring strategy to detect issues

## Validation

### Success Criteria
How will we know this decision was successful?
- Metrics to track
- Outcomes to measure
- Timeline for evaluation

### Review Schedule
- When to review this decision
- What triggers might require re-evaluation
- Who should be involved in reviews

## References

### Related Decisions
- [Document Template](./document-template.md): Standard documentation template

### External Resources
- Documentation that influenced this decision
- Research papers or articles consulted
- Community discussions or best practices

### Implementation Details
- Links to code changes
- Configuration files
- Deployment guides

---

*This ADR preserves the context and rationale for future developers and LLM agents to understand why decisions were made.*