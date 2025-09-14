import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}
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
    return NextResponse.json(contracts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = ContractSchema.parse(body)

    const contract = await prisma.contract.create({
      data: {
        ...validatedData,
        signedDate: new Date(validatedData.signedDate),
      },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
  }
}