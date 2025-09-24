---
title: "API Endpoint Implementation Example"
type: "example"
audience: ["developer", "agent"]
contexts: ["api-development", "team-isolation", "security"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["api-developer", "security-reviewer"]
related:
  - agents/contexts/api-development.md
  - agents/patterns/error-handling.md
  - developer/architecture/decisions/adr-001-team-based-isolation.md
---

# API Endpoint Implementation Example

## Context for LLM Agents

**Scope**: Complete example of implementing a secure, team-isolated API endpoint in ArqCashflow
**Prerequisites**: Understanding of Next.js API routes, Prisma ORM, team isolation patterns, and Zod validation
**Key Patterns Applied**:
- Team-based data isolation at API level
- Comprehensive error handling with appropriate HTTP status codes
- Type-safe request/response validation with Zod
- Standardized API route structure

## Overview

This example demonstrates implementing a complete CRUD API endpoint for managing contracts with proper team isolation, validation, and error handling.

## Complete Implementation

### 1. API Route Structure

```typescript
// app/api/contracts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Request validation schemas
const contractCreateSchema = z.object({
  title: z.string().min(1, "Contract title is required").max(200),
  clientName: z.string().min(1, "Client name is required").max(100),
  totalValue: z.number().positive("Total value must be positive"),
  startDate: z.string().datetime("Invalid start date format"),
  endDate: z.string().datetime("Invalid end date format"),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  description: z.string().optional(),
})

const contractQuerySchema = z.object({
  status: z.enum(['all', 'draft', 'active', 'completed', 'cancelled']).default('all'),
  sortBy: z.enum(['createdAt', 'title', 'totalValue', 'startDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

// GET /api/contracts - List contracts with filtering
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams)
    const validationResult = contractQuerySchema.safeParse(queryParams)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validationResult.error.flatten()
      }, { status: 400 })
    }

    const { status, sortBy, sortOrder, page, limit, search } = validationResult.data

    // 3. Build team-isolated database query
    const where: any = { teamId: session.user.teamId }

    // Apply status filter
    if (status !== 'all') {
      where.status = status
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 4. Execute query with pagination
    const [contracts, totalCount] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          receivables: {
            select: { id: true, amount: true, status: true }
          },
          _count: {
            select: { receivables: true, expenses: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contract.count({ where })
    ])

    // 5. Return successful response with metadata
    return NextResponse.json({
      contracts,
      metadata: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrevious: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/contracts - Create new contract
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validationResult = contractCreateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten()
      }, { status: 400 })
    }

    const contractData = validationResult.data

    // 3. Business logic validation
    if (new Date(contractData.endDate) <= new Date(contractData.startDate)) {
      return NextResponse.json({
        error: 'End date must be after start date'
      }, { status: 400 })
    }

    // 4. Create contract with team isolation
    const contract = await prisma.contract.create({
      data: {
        ...contractData,
        teamId: session.user.teamId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        receivables: true,
        _count: {
          select: { receivables: true, expenses: true }
        }
      }
    })

    // 5. Return created resource
    return NextResponse.json(contract, { status: 201 })

  } catch (error) {
    console.error('Error creating contract:', error)

    // Handle specific database errors
    if (error.code === 'P2002') {
      return NextResponse.json({
        error: 'A contract with this title already exists'
      }, { status: 409 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2. Individual Resource Operations

```typescript
// app/api/contracts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const contractUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  clientName: z.string().min(1).max(100).optional(),
  totalValue: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  description: z.string().optional(),
})

// GET /api/contracts/[id] - Get single contract
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate ID parameter
    const contractId = parseInt(params.id)
    if (isNaN(contractId)) {
      return NextResponse.json({ error: 'Invalid contract ID' }, { status: 400 })
    }

    // 3. Fetch contract with team isolation
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        teamId: session.user.teamId // Critical: team isolation
      },
      include: {
        receivables: {
          orderBy: { dueDate: 'asc' }
        },
        expenses: {
          orderBy: { date: 'desc' }
        },
        _count: {
          select: { receivables: true, expenses: true }
        }
      }
    })

    // 4. Handle not found
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // 5. Return contract data
    return NextResponse.json(contract)

  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/contracts/[id] - Update contract
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate ID parameter
    const contractId = parseInt(params.id)
    if (isNaN(contractId)) {
      return NextResponse.json({ error: 'Invalid contract ID' }, { status: 400 })
    }

    // 3. Parse and validate request body
    const body = await request.json()
    const validationResult = contractUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten()
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // 4. Business logic validation
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.endDate) <= new Date(updateData.startDate)) {
        return NextResponse.json({
          error: 'End date must be after start date'
        }, { status: 400 })
      }
    }

    // 5. Update contract with team isolation
    const contract = await prisma.contract.updateMany({
      where: {
        id: contractId,
        teamId: session.user.teamId // Critical: team isolation
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    // 6. Check if contract was found and updated
    if (contract.count === 0) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // 7. Fetch and return updated contract
    const updatedContract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        teamId: session.user.teamId
      },
      include: {
        receivables: true,
        _count: {
          select: { receivables: true, expenses: true }
        }
      }
    })

    return NextResponse.json(updatedContract)

  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/contracts/[id] - Delete contract
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate ID parameter
    const contractId = parseInt(params.id)
    if (isNaN(contractId)) {
      return NextResponse.json({ error: 'Invalid contract ID' }, { status: 400 })
    }

    // 3. Check if contract has dependencies
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        teamId: session.user.teamId
      },
      include: {
        _count: {
          select: { receivables: true, expenses: true }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // 4. Business logic: prevent deletion if has dependencies
    if (contract._count.receivables > 0 || contract._count.expenses > 0) {
      return NextResponse.json({
        error: 'Cannot delete contract with associated receivables or expenses',
        details: {
          receivables: contract._count.receivables,
          expenses: contract._count.expenses
        }
      }, { status: 409 })
    }

    // 5. Delete contract with team isolation
    await prisma.contract.deleteMany({
      where: {
        id: contractId,
        teamId: session.user.teamId // Critical: team isolation
      }
    })

    // 6. Return success response
    return NextResponse.json({ message: 'Contract deleted successfully' })

  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Key Implementation Points

### 1. Team Isolation Security
- **Always filter by `teamId`**: Every database query MUST include team filtering
- **Use `updateMany`/`deleteMany`**: Ensures operations only affect team's data
- **Validate ownership**: Check resource exists for team before operations

### 2. Comprehensive Validation
- **Schema validation**: Use Zod for all request/response validation
- **Business logic**: Validate business rules beyond basic type checking
- **Parameter validation**: Validate URL parameters and query strings

### 3. Error Handling Patterns
- **Appropriate HTTP status codes**: 400 for validation, 401 for auth, 404 for not found, etc.
- **Structured error responses**: Consistent error message format
- **Detailed validation errors**: Include field-specific validation failures

### 4. Performance Considerations
- **Strategic includes**: Only include related data that's needed
- **Pagination**: Always implement pagination for list endpoints
- **Efficient queries**: Use Promise.all() for parallel database operations

## Usage in Client Components

```typescript
// Example usage in a React component
async function fetchContracts(filters: ContractFilters) {
  const queryParams = new URLSearchParams({
    status: filters.status || 'all',
    sortBy: filters.sortBy || 'createdAt',
    sortOrder: filters.sortOrder || 'desc',
    page: filters.page?.toString() || '1',
    limit: filters.limit?.toString() || '20',
    ...(filters.search && { search: filters.search })
  })

  const response = await fetch(`/api/contracts?${queryParams}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch contracts')
  }

  return response.json()
}
```

---

*This example demonstrates the complete implementation pattern for secure, team-isolated API endpoints in ArqCashflow, following all established patterns and best practices.*