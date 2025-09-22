import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createDateForStorage, getReceivableActualStatus, isReceivableOverdue } from '@/lib/date-utils'
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

    // Handle status filtering with calculated overdue logic
    if (status && status !== 'all') {
      if (status === 'overdue') {
        // For overdue filter, get pending items and filter after calculation
        where.status = 'pending'
      } else {
        where.status = status
      }
    }

    if (category && category !== 'all') where.category = category

    // Valid sort fields
    const validSortFields = ['expectedDate', 'amount', 'status', 'receivedDate', 'createdAt', 'category']
    const orderBy: any = {}

    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.expectedDate = 'asc'
    }

    let receivables = await prisma.receivable.findMany({
      where,
      include: {
        contract: true,
      },
      orderBy,
    })

    // Update status based on current date and apply post-filter for calculated statuses
    const requestedStatus = status
    const receivablesWithUpdatedStatus = receivables.map(receivable => {
      const actualStatus = getReceivableActualStatus(receivable)
      if (actualStatus !== receivable.status) {
        return { ...receivable, status: actualStatus }
      }
      return receivable
    })

    // Apply post-filter for calculated statuses
    let filteredReceivables = receivablesWithUpdatedStatus
    if (requestedStatus === 'overdue') {
      // Filter to only show overdue items
      filteredReceivables = receivablesWithUpdatedStatus.filter(receivable =>
        receivable.status === 'overdue'
      )
    } else if (requestedStatus === 'pending') {
      // Filter to only show truly pending (not overdue) items
      filteredReceivables = receivablesWithUpdatedStatus.filter(receivable =>
        receivable.status === 'pending'
      )
    }

    console.log('💰 RECEIVABLES FOUND:', {
      count: filteredReceivables.length,
      teamId,
      requestedStatus,
      receivableIds: filteredReceivables.map(r => ({
        id: r.id,
        contractId: r.contractId,
        contract: r.contract ? `${r.contract.clientName} - ${r.contract.projectName}` : 'No Contract',
        amount: r.amount,
        status: r.status
      }))
    })

    return NextResponse.json(filteredReceivables)
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

    // 🔍 DEBUG: Track value at API level for receivables
    console.log('💰 RECEIVABLES API DEBUG - Value tracking:')
    console.log('  - Raw request body:', body)
    console.log('  - Body amount:', body.amount)
    console.log('  - Body amount type:', typeof body.amount)
    console.log('  - Body amount precise?:', Number.isInteger(body.amount * 100))

    const validatedData = ReceivableSchema.parse(body)

    console.log('  - After Zod validation:', validatedData)
    console.log('  - Validated amount:', validatedData.amount)
    console.log('  - Validated amount type:', typeof validatedData.amount)
    console.log('  - Validated amount precise?:', Number.isInteger(validatedData.amount * 100))

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

    // 🔧 FIX: Prepare data object separately to avoid spread timing issues
    const dataForDB: any = {
      contractId: validatedData.contractId,
      expectedDate: validatedData.expectedDate && validatedData.expectedDate.trim() !== '' ? createDateForStorage(validatedData.expectedDate) : new Date(),
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
      dataForDB.receivedDate = validatedData.receivedDate && validatedData.receivedDate.trim() !== '' ? createDateForStorage(validatedData.receivedDate) : null
    }

    console.log('  - Data prepared for DB:', dataForDB)
    console.log('  - DB amount:', dataForDB.amount)
    console.log('  - DB amount type:', typeof dataForDB.amount)

    const receivable = await prisma.receivable.create({
      data: dataForDB,
      include: { contract: true }
    })

    console.log('✅ RECEIVABLE CREATED:', {
      receivableId: receivable.id,
      storedAmount: receivable.amount,
      storedAmountType: typeof receivable.amount,
      storedAmountPrecise: Number.isInteger(receivable.amount * 100)
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