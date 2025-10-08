/**
 * AI Filtering API - Natural Language to Prisma Query
 *
 * Provides AI-powered filtering using Claude to generate Prisma query objects
 * from natural language input. Executes queries with team isolation.
 */

import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { FilterAgentService, FilterContext } from '@/lib/services/FilterAgentService'

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    try {
      const body = await request.json()
      const { input, entity } = body

      // Validation
      if (!input || typeof input !== 'string') {
        return Response.json(
          { error: 'Input is required and must be a string' },
          { status: 400 }
        )
      }

      if (!entity || !['receivable', 'expense', 'contract'].includes(entity)) {
        return Response.json(
          { error: 'Entity must be one of: receivable, expense, contract' },
          { status: 400 }
        )
      }

      // Create filter context
      const filterContext: FilterContext = {
        entity: entity as 'receivable' | 'expense' | 'contract',
        teamId: context.teamId
      }

      // Parse filter using FilterAgentService
      console.log('[AI Filter] Processing query:', { input, entity, teamId: context.teamId })
      const filterService = new FilterAgentService(context)
      const parsedFilter = await filterService.parseFilter(input, filterContext)

      console.log('[AI Filter] Parsed query:', JSON.stringify(parsedFilter, null, 2))

      // Execute Prisma query with team isolation
      const results = await executeQuery(
        entity,
        parsedFilter.where,
        parsedFilter.orderBy,
        context
      )

      console.log('[AI Filter] Query results:', { count: results.length })

      return Response.json({
        success: true,
        query: parsedFilter,
        results,
        count: results.length
      })

    } catch (error) {
      console.error('=== AI Filtering ERROR ===')
      console.error('Error details:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return Response.json(
        {
          success: false,
          error: errorMessage,
          message: 'Não consegui processar sua consulta. Por favor, tente reformular.'
        },
        { status: 500 }
      )
    }
  })
}

/**
 * Execute Prisma query with team isolation
 */
async function executeQuery(
  entity: string,
  where: any,
  orderBy: any,
  context: any
): Promise<any[]> {
  // Add team isolation to where clause
  const baseWhere = { ...where, teamId: context.teamId }

  switch (entity) {
    case 'receivable':
      return await context.teamScopedPrisma.receivable.findMany({
        where: baseWhere,
        orderBy,
        include: {
          contract: {
            select: {
              projectName: true,
              clientName: true
            }
          }
        },
        take: 100 // Limit to 100 results for performance
      })

    case 'expense':
      return await context.teamScopedPrisma.expense.findMany({
        where: baseWhere,
        orderBy,
        include: {
          contract: {
            select: {
              projectName: true,
              clientName: true
            }
          }
        },
        take: 100
      })

    case 'contract':
      return await context.teamScopedPrisma.contract.findMany({
        where: baseWhere,
        orderBy,
        take: 100
      })

    default:
      throw new Error(`Unknown entity type: ${entity}`)
  }
}
