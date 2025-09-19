import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createAuditContextFromAPI, auditCreate, safeAudit } from '@/lib/audit-middleware'

const ReceivableSchema = z.object({
  contractId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  expectedDate: z.string(),
  amount: z.number(),
  status: z.string().optional(),
  receivedDate: z.string().optional().nullable(),
  receivedAmount: z.number().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // New fields for non-contract receivables
  clientName: z.string().optional().nullable().transform(val => val === '' ? null : val),
  description: z.string().optional().nullable().transform(val => val === '' ? null : val),
})

export async function GET(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth()
    console.log('🔍 RECEIVABLES FETCH DEBUG:', {
      userId: user.id,
      userEmail: user.email,
      teamId,
      teamName: user.team?.name
    })

    const searchParams = request.nextUrl.searchParams
    const contractId = searchParams.get('contractId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'expectedDate'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const where: any = {
      OR: [
        // Contract-based receivables
        {
          contract: {
            teamId
          }
        },
        // Non-contract receivables
        {
          teamId: teamId
        }
      ]
    }

    if (contractId && contractId !== 'all') {
      if (contractId === 'none') {
        // Only non-contract receivables - maintain team filtering
        where.AND = [
          { teamId: teamId },
          { contractId: null }
        ]
        delete where.OR // Remove the OR condition when filtering for none
      } else {
        // Specific contract - ensure it belongs to the team
        where.AND = [
          {
            OR: [
              // Contract-based receivables
              {
                contract: {
                  teamId
                }
              },
              // Non-contract receivables
              {
                teamId: teamId
              }
            ]
          },
          { contractId: contractId }
        ]
        delete where.OR // Remove the top-level OR when filtering by specific contract
      }
    }

    if (status && status !== 'all') where.status = status
    if (category && category !== 'all') where.category = category

    // Valid sort fields
    const validSortFields = ['expectedDate', 'amount', 'status', 'receivedDate', 'createdAt', 'category']
    const orderBy: any = {}

    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.expectedDate = 'asc'
    }

    const receivables = await prisma.receivable.findMany({
      where,
      include: {
        contract: true,
      },
      orderBy,
    })

    // Update status based on current date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const receivablesWithUpdatedStatus = receivables.map(receivable => {
      // Only update status if it's pending and not received
      if (receivable.status === 'pending' && !receivable.receivedDate) {
        const expectedDate = new Date(receivable.expectedDate)
        expectedDate.setHours(0, 0, 0, 0)

        if (expectedDate < today) {
          return { ...receivable, status: 'overdue' }
        }
      }
      return receivable
    })

    console.log('💰 RECEIVABLES FOUND:', {
      count: receivablesWithUpdatedStatus.length,
      teamId,
      receivableIds: receivablesWithUpdatedStatus.map(r => ({
        id: r.id,
        contractId: r.contractId,
        contract: r.contract ? `${r.contract.clientName} - ${r.contract.projectName}` : 'No Contract',
        amount: r.amount
      }))
    })

    return NextResponse.json(receivablesWithUpdatedStatus)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized - User authentication required' }, { status: 401 })
    }
    console.error('Receivables fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch receivables', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth()

    const body = await request.json()
    const validatedData = ReceivableSchema.parse(body)

    // If contractId is provided, verify that the contract belongs to the user's team
    if (validatedData.contractId) {
      const contract = await prisma.contract.findFirst({
        where: {
          id: validatedData.contractId,
          teamId
        }
      })

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found or access denied' }, { status: 404 })
      }
    }

    const createData: any = {
      contractId: validatedData.contractId,
      expectedDate: new Date(validatedData.expectedDate + 'T00:00:00.000Z'),
      amount: validatedData.amount,
      status: validatedData.status || 'pending',
      receivedAmount: validatedData.receivedAmount || null,
      invoiceNumber: validatedData.invoiceNumber || null,
      category: validatedData.category || null,
      notes: validatedData.notes || null,
      // New fields for non-contract receivables
      clientName: validatedData.clientName || null,
      description: validatedData.description || null,
      teamId: teamId, // Always set teamId for proper data isolation
    }

    if (validatedData.receivedDate && validatedData.receivedDate.trim() !== '') {
      createData.receivedDate = new Date(validatedData.receivedDate + 'T00:00:00.000Z')
    }

    const receivable = await prisma.receivable.create({
      data: createData,
      include: { contract: true }
    })

    // Log audit entry for receivable creation
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'receivable_creation',
        source: 'api',
        contractId: receivable.contractId
      })
      await auditCreate(auditContext, 'receivable', receivable.id, receivable)
    })

    return NextResponse.json({
      receivable
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Receivable creation error:', error)
    return NextResponse.json({ error: 'Failed to create receivable' }, { status: 500 })
  }
}