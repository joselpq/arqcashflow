import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createDateForStorage } from '@/lib/date-utils'
import { createAuditContextFromAPI, auditCreate, safeAudit } from '@/lib/audit-middleware'

const ContractSchema = z.object({
  clientName: z.string(),
  projectName: z.string(),
  description: z.string().optional(),
  totalValue: z.number(),
  signedDate: z.string(),
  status: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth()
    console.log('🔍 CONTRACT FETCH DEBUG:', {
      userId: user.id,
      userEmail: user.email,
      teamId,
      teamName: user.team?.name
    })

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {
      teamId  // Ensure we only get contracts for this team
    }
    if (status && status !== 'all') where.status = status
    if (category && category !== 'all') where.category = category

    // Valid sort fields
    const validSortFields = ['createdAt', 'signedDate', 'clientName', 'projectName', 'totalValue', 'status']
    const orderBy: any = {}

    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        receivables: true,
      },
      orderBy,
    })

    console.log('📄 CONTRACTS FOUND:', {
      count: contracts.length,
      teamId,
      contractIds: contracts.map(c => ({ id: c.id, teamId: c.teamId, client: c.clientName, project: c.projectName }))
    })

    // 🔍 DEBUG: Track values when fetched from DB
    console.log('📊 DB FETCH DEBUG - Value tracking:')
    contracts.forEach((contract, index) => {
      console.log(`  Contract ${index + 1}:`)
      console.log(`    - ID: ${contract.id}`)
      console.log(`    - Client: ${contract.clientName}`)
      console.log(`    - DB totalValue: ${contract.totalValue}`)
      console.log(`    - DB totalValue type: ${typeof contract.totalValue}`)
      console.log(`    - DB totalValue precise?: ${Number.isInteger(contract.totalValue * 100)}`)
      console.log(`    - DB totalValue as string: "${contract.totalValue.toString()}"`)
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('❌ CONTRACT FETCH ERROR:', error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth()
    console.log('🔍 CONTRACT CREATION DEBUG:', {
      userId: user.id,
      userEmail: user.email,
      teamId,
      teamName: user.team?.name
    })

    const body = await request.json()

    // 🔍 DEBUG: Track value at API level
    console.log('🌐 API DEBUG - Value tracking:')
    console.log('  - Raw request body:', body)
    console.log('  - Body totalValue:', body.totalValue)
    console.log('  - Body totalValue type:', typeof body.totalValue)
    console.log('  - Body totalValue precise?:', Number.isInteger(body.totalValue * 100))

    const validatedData = ContractSchema.parse(body)

    console.log('  - After Zod validation:', validatedData)
    console.log('  - Validated totalValue:', validatedData.totalValue)
    console.log('  - Validated totalValue type:', typeof validatedData.totalValue)
    console.log('  - Validated totalValue precise?:', Number.isInteger(validatedData.totalValue * 100))

    const contract = await prisma.contract.create({
      data: {
        ...validatedData,
        teamId,
        signedDate: validatedData.signedDate && validatedData.signedDate.trim() !== '' ? createDateForStorage(validatedData.signedDate) : new Date(),
      },
    })

    console.log('✅ CONTRACT CREATED:', {
      contractId: contract.id,
      assignedTeamId: contract.teamId,
      clientName: contract.clientName,
      projectName: contract.projectName,
      storedTotalValue: contract.totalValue,
      storedValueType: typeof contract.totalValue,
      storedValuePrecise: Number.isInteger(contract.totalValue * 100)
    })

    // Log audit entry for contract creation
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'contract_creation',
        source: 'api'
      })
      await auditCreate(auditContext, 'contract', contract.id, contract)
    })

    return NextResponse.json({
      contract
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized - User must belong to a team' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Contract creation error:', error)
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
  }
}