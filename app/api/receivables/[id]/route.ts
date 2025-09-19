import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateReceivableSchema = z.object({
  expectedDate: z.string().optional(),
  amount: z.number().optional(),
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = UpdateReceivableSchema.parse(body)

    const updateData: any = { ...validatedData }
    if (validatedData.expectedDate) {
      updateData.expectedDate = new Date(validatedData.expectedDate + 'T00:00:00.000Z')
    }
    if (validatedData.receivedDate) {
      updateData.receivedDate = new Date(validatedData.receivedDate + 'T00:00:00.000Z')
    }

    const receivable = await prisma.receivable.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(receivable)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update receivable' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.receivable.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Receivable deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete receivable' }, { status: 500 })
  }
}