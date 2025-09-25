import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ContractService } from '@/lib/services/ContractService'

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
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    const contractService = new ContractService({ ...context, request })
    const contract = await contractService.findById(id, { receivables: true })

    if (!contract) {
      throw new Error('Contract not found')
    }

    return contract
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params
    const body = await request.json()

    const contractService = new ContractService({ ...context, request })
    const validatedData = UpdateContractSchema.parse(body)

    const updatedContract = await contractService.update(id, validatedData)

    if (!updatedContract) {
      throw new Error('Contract not found')
    }

    return {
      contract: updatedContract
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    const contractService = new ContractService({ ...context, request })
    const success = await contractService.delete(id)

    if (!success) {
      throw new Error('Contract not found')
    }

    return { message: 'Contract deleted successfully' }
  })
}