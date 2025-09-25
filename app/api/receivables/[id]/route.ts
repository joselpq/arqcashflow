/**
 * Individual Receivable Operations with Service Layer
 *
 * Phase 3 service layer migration - migrated from middleware approach to service layer.
 * Provides GET, PUT, and DELETE operations for individual receivables.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ReceivableService } from '@/lib/services/ReceivableService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const receivableService = new ReceivableService(context)
    const { id } = await params

    const receivable = await receivableService.findById(id)

    if (!receivable) {
      return NextResponse.json({ error: 'Receivable not found' }, { status: 404 })
    }

    return receivable
  }).then(result => {
    // If result is already a NextResponse, return it as-is
    if (result instanceof NextResponse) {
      return result
    }
    return NextResponse.json(result)
  })
    .catch(error => {
      console.error('RECEIVABLE FETCH ERROR:', error)
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Failed to fetch receivable' }, { status: 500 })
    })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const receivableService = new ReceivableService(context)
    const { id } = await params
    const body = await request.json()

    const receivable = await receivableService.update(id, body)

    return receivable
  }).then(result => NextResponse.json(result))
    .catch(error => {
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors }, { status: 400 })
      }
      console.error('Receivable update error:', error)
      return NextResponse.json({ error: 'Failed to update receivable' }, { status: 500 })
    })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const receivableService = new ReceivableService(context)
    const { id } = await params

    await receivableService.delete(id)

    return { message: 'Receivable deleted successfully' }
  }).then(result => NextResponse.json(result))
    .catch(error => {
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      console.error('Receivable deletion error:', error)
      return NextResponse.json({ error: 'Failed to delete receivable' }, { status: 500 })
    })
}