/**
 * Contract Auto-Number API Route
 *
 * POST /api/contracts/auto-number
 * Returns a unique project name suggestion with auto-numbering
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ContractService } from '@/lib/services/ContractService'

const AutoNumberSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  projectName: z.string().min(1, 'Project name is required'),
  excludeId: z.string().optional(), // For updates
})

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const body = await request.json()
    const { clientName, projectName, excludeId } = AutoNumberSchema.parse(body)

    const contractService = new ContractService({ ...context, request })
    const uniqueName = await contractService.generateUniqueProjectName(
      clientName,
      projectName,
      excludeId
    )

    return {
      originalName: projectName,
      suggestedName: uniqueName,
      isChanged: uniqueName !== projectName
    }
  })
}