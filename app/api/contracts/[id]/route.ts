import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
    const contract = await prisma.contract.findUnique({
      where: { id: params.id },
      include: { receivables: true },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = UpdateContractSchema.parse(body)

    const updateData: any = { ...validatedData }
    if (validatedData.signedDate) {
      updateData.signedDate = new Date(validatedData.signedDate)
    }

    const contract = await prisma.contract.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(contract)
  } catch (error) {
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
    await prisma.contract.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Contract deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 })
  }
}