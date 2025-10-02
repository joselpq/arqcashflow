import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

/**
 * Team Context Interface
 * Provides all necessary context for team-scoped operations
 */
export interface TeamContext {
  user: Awaited<ReturnType<typeof requireAuth>>['user']
  teamId: string
  teamScopedPrisma: TeamScopedPrismaClient
}

/**
 * Team-scoped Prisma client that automatically filters by teamId
 * WARNING: This is a wrapper around the existing prisma client
 * It does NOT modify the original client behavior
 */
export interface TeamScopedPrismaClient {
  // Core financial entities (most commonly used)
  contract: {
    findMany: (args?: any) => Promise<any[]>
    findUnique: (args: any) => Promise<any>
    findFirst: (args?: any) => Promise<any>
    create: (args: any) => Promise<any>
    update: (args: any) => Promise<any>
    updateMany: (args: any) => Promise<any>
    delete: (args: any) => Promise<any>
    deleteMany: (args: any) => Promise<any>
    count: (args?: any) => Promise<number>
  }
  receivable: {
    findMany: (args?: any) => Promise<any[]>
    findUnique: (args: any) => Promise<any>
    findFirst: (args?: any) => Promise<any>
    create: (args: any) => Promise<any>
    update: (args: any) => Promise<any>
    updateMany: (args: any) => Promise<any>
    delete: (args: any) => Promise<any>
    deleteMany: (args: any) => Promise<any>
    count: (args?: any) => Promise<number>
  }
  expense: {
    findMany: (args?: any) => Promise<any[]>
    findUnique: (args: any) => Promise<any>
    findFirst: (args?: any) => Promise<any>
    create: (args: any) => Promise<any>
    update: (args: any) => Promise<any>
    updateMany: (args: any) => Promise<any>
    delete: (args: any) => Promise<any>
    deleteMany: (args: any) => Promise<any>
    count: (args?: any) => Promise<number>
  }
  recurringExpense: {
    findMany: (args?: any) => Promise<any[]>
    findUnique: (args: any) => Promise<any>
    findFirst: (args?: any) => Promise<any>
    create: (args: any) => Promise<any>
    update: (args: any) => Promise<any>
    delete: (args: any) => Promise<any>
    count: (args?: any) => Promise<number>
  }
  auditLog: {
    findMany: (args?: any) => Promise<any[]>
    findUnique: (args: any) => Promise<any>
    findFirst: (args?: any) => Promise<any>
    create: (args: any) => Promise<any>
    count: (args?: any) => Promise<number>
  }
  // Access to original prisma client for complex queries
  raw: PrismaClient
}

/**
 * Creates a team-scoped Prisma client wrapper
 * SAFETY: This is a wrapper that adds teamId automatically
 * It does NOT modify the underlying Prisma client
 */
export function createTeamScopedPrisma(teamId: string): TeamScopedPrismaClient {
  // Helper function to ensure teamId is included in where clauses
  const ensureTeamScope = (args: any = {}) => {
    // If no where clause, create one with teamId
    if (!args.where) {
      return { ...args, where: { teamId } }
    }

    // SECURITY: Remove any existing teamId and force the correct one
    const { teamId: _, ...whereWithoutTeamId } = args.where;

    return {
      ...args,
      where: {
        ...whereWithoutTeamId,
        teamId // FORCE the correct team isolation - ignore any malicious teamId
      }
    }
  }

  // Helper for create operations - add teamId to data
  const ensureTeamScopeCreate = (args: any) => {
    if (!args.data) {
      throw new Error('Create operation requires data')
    }

    return {
      ...args,
      data: {
        ...args.data,
        teamId // Automatically add teamId to created records
      }
    }
  }

  // Create wrapper for each entity type
  const createEntityMethods = (entityName: keyof PrismaClient) => ({
    findMany: (args?: any) => {
      const scopedArgs = ensureTeamScope(args)
      return (prisma[entityName] as any).findMany(scopedArgs)
    },
    findUnique: (args: any) => {
      const scopedArgs = ensureTeamScope(args)
      return (prisma[entityName] as any).findUnique(scopedArgs)
    },
    findFirst: (args?: any) => {
      const scopedArgs = ensureTeamScope(args)
      return (prisma[entityName] as any).findFirst(scopedArgs)
    },
    create: (args: any) => {
      const scopedArgs = ensureTeamScopeCreate(args)
      return (prisma[entityName] as any).create(scopedArgs)
    },
    update: (args: any) => {
      const scopedArgs = ensureTeamScope(args)
      return (prisma[entityName] as any).update(scopedArgs)
    },
    updateMany: (args: any) => {
      const scopedArgs = ensureTeamScope(args)
      return (prisma[entityName] as any).updateMany(scopedArgs)
    },
    delete: (args: any) => {
      const scopedArgs = ensureTeamScope(args)
      return (prisma[entityName] as any).delete(scopedArgs)
    },
    deleteMany: (args: any) => {
      const scopedArgs = ensureTeamScope(args)
      return (prisma[entityName] as any).deleteMany(scopedArgs)
    },
    count: (args?: any) => {
      const scopedArgs = ensureTeamScope(args)
      return (prisma[entityName] as any).count(scopedArgs)
    }
  })

  return {
    contract: createEntityMethods('contract'),
    receivable: createEntityMethods('receivable'),
    expense: createEntityMethods('expense'),
    recurringExpense: createEntityMethods('recurringExpense'),
    auditLog: {
      findMany: (args?: any) => {
        const scopedArgs = ensureTeamScope(args)
        return prisma.auditLog.findMany(scopedArgs)
      },
      findUnique: (args: any) => {
        const scopedArgs = ensureTeamScope(args)
        return prisma.auditLog.findUnique(scopedArgs)
      },
      findFirst: (args?: any) => {
        const scopedArgs = ensureTeamScope(args)
        return prisma.auditLog.findFirst(scopedArgs)
      },
      create: (args: any) => {
        const scopedArgs = ensureTeamScopeCreate(args)
        return prisma.auditLog.create(scopedArgs)
      },
      count: (args?: any) => {
        const scopedArgs = ensureTeamScope(args)
        return prisma.auditLog.count(scopedArgs)
      }
    },
    raw: prisma // Access to original client for complex operations
  }
}

/**
 * Team Context Middleware
 *
 * SAFETY GUARANTEES:
 * 1. Uses existing requireAuth() - no behavior change
 * 2. Creates wrapper around existing prisma - no modification
 * 3. Automatic team isolation - prevents data leaks
 * 4. Backwards compatible - can be used alongside existing patterns
 *
 * @param handler Function that receives team context
 * @returns Promise with handler result
 */
export async function withTeamContext<T>(
  handler: (context: TeamContext) => Promise<T>
): Promise<NextResponse> {
  try {
    // Use existing requireAuth - no behavior change
    const { user, teamId } = await requireAuth()

    // Create team-scoped prisma client
    const teamScopedPrisma = createTeamScopedPrisma(teamId)

    // Execute handler with context
    const result = await handler({
      user,
      teamId,
      teamScopedPrisma
    })

    return NextResponse.json(result)
  } catch (error) {
    // Handle auth errors (maintains existing behavior)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle "not found" errors
    if (error instanceof Error && (
      error.message.includes("not found") ||
      error.message.includes("Not found")
    )) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Handle "access denied" errors
    if (error instanceof Error && (
      error.message.includes("Access denied") ||
      error.message.includes("access denied")
    )) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json({ error: error }, { status: 400 })
    }

    // Handle other errors
    console.error('Team context middleware error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Response helper for team context middleware
 * Provides consistent response handling
 */
export function teamContextResponse<T>(
  handler: (context: TeamContext) => Promise<T>
) {
  return async (): Promise<NextResponse> => {
    try {
      const result = await withTeamContext(handler)
      return NextResponse.json(result)
    } catch (error) {
      console.error('Team context middleware error:', error)

      // Handle auth errors (maintains existing behavior)
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Handle other errors
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Type helper for API route handlers
 * Provides type safety for team context operations
 */
export type TeamContextHandler<T = any> = (context: TeamContext) => Promise<T>

/**
 * Development helper to compare old vs new approach
 * This function helps validate that middleware produces same results
 */
export async function validateTeamContextEquivalence(
  teamId: string,
  oldQuery: () => Promise<any>,
  newQuery: (prisma: TeamScopedPrismaClient) => Promise<any>
): Promise<{ matches: boolean; oldResult: any; newResult: any }> {
  const oldResult = await oldQuery()
  const scopedPrisma = createTeamScopedPrisma(teamId)
  const newResult = await newQuery(scopedPrisma)

  return {
    matches: JSON.stringify(oldResult) === JSON.stringify(newResult),
    oldResult,
    newResult
  }
}