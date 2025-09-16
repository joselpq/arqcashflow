import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'

const UpdateContractSchema = z.object({
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  description: z.string().optional(),
  totalValue: z.number().optional(),
  signedDate: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { teamId } = await requireAuth()

    const contract = await prisma.contract.findFirst({
      where: { id: params.id, teamId },
      include: { receivables: true },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { teamId } = await requireAuth()

    const body = await request.json()
    const validatedData = UpdateContractSchema.parse(body)

    const updateData: any = { ...validatedData }
    if (validatedData.signedDate) {
      updateData.signedDate = new Date(validatedData.signedDate + 'T00:00:00.000Z')
    }

    const contract = await prisma.contract.updateMany({
      where: { id: params.id, teamId },
      data: updateData,
    })

    if (contract.count === 0) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const updatedContract = await prisma.contract.findFirst({
      where: { id: params.id, teamId }
    })

    return NextResponse.json({
      contract: updatedContract
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { teamId } = await requireAuth()

    const result = await prisma.contract.deleteMany({
      where: { id: params.id, teamId },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Contract deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 })
  }
}