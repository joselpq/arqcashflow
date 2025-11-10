import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ContractService } from '@/lib/services/ContractService'
import { ContractSchemas } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    const contractService = new ContractService({ ...context, request })
    const contract = await contractService.findById(id)

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

    // Get profession for profession-aware validation
    const profession = context.user.team.profession

    // Use unified validation schema for updates
    const validatedData = ContractSchemas.update(profession).parse(body)

    const contractService = new ContractService({ ...context, request })
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
    const url = new URL(request.url)
    const deleteMode = url.searchParams.get('mode') as 'contract-only' | 'contract-and-receivables'

    const contractService = new ContractService({ ...context, request })
    const success = await contractService.delete(id, {
      mode: deleteMode || 'contract-only'
    })

    if (!success) {
      throw new Error('Contract not found')
    }

    return {
      message: 'Contract deleted successfully',
      mode: deleteMode || 'contract-only'
    }
  })
}