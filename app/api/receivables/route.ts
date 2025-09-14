import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ReceivableSchema = z.object({
  contractId: z.string(),
  expectedDate: z.string(),
  amount: z.number(),
  status: z.string().optional(),
  receivedDate: z.string().optional().nullable(),
  receivedAmount: z.number().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const contractId = searchParams.get('contractId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'expectedDate'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const where: any = {}
    if (contractId && contractId !== 'all') where.contractId = contractId
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

    return NextResponse.json(receivablesWithUpdatedStatus)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch receivables' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = ReceivableSchema.parse(body)

    const createData: any = {
      ...validatedData,
      expectedDate: new Date(validatedData.expectedDate),
    }

    if (validatedData.receivedDate) {
      createData.receivedDate = new Date(validatedData.receivedDate)
    }

    const receivable = await prisma.receivable.create({
      data: createData,
    })

    return NextResponse.json(receivable, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create receivable' }, { status: 500 })
  }
}