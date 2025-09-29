/**
 * Contract Deletion Info API Route
 *
 * GET /api/contracts/[id]/deletion-info
 * Returns information about what will be affected by deleting a contract
 */

import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ContractService } from '@/lib/services/ContractService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    const contractService = new ContractService({ ...context, request })
    const deletionInfo = await contractService.getDeletionInfo(id)

    return deletionInfo
  })
}