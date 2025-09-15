import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleSheetsService } from '@/lib/googleSheets'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    // Check if Google Sheets is configured
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Google Sheets API not configured. Please set up service account credentials.' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Fetch all contracts with receivables (same logic as Excel export)
    const contracts = await prisma.contract.findMany({
      include: {
        receivables: {
          orderBy: {
            expectedDate: 'asc',
          },
        },
      },
      orderBy: {
        signedDate: 'desc',
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Prepare contracts data
    const contractsData = contracts.map(contract => {
      const totalReceivables = contract.receivables.reduce((sum, r) => sum + r.amount, 0)
      const received = contract.receivables
        .filter(r => r.status === 'received')
        .reduce((sum, r) => sum + (r.receivedAmount || 0), 0)

      const pending = contract.receivables
        .filter(r => {
          if (r.status === 'received' || r.receivedDate) return false
          const expectedDate = new Date(r.expectedDate)
          expectedDate.setHours(0, 0, 0, 0)
          return expectedDate >= today
        })
        .reduce((sum, r) => sum + r.amount, 0)

      return {
        clientName: contract.clientName,
        projectName: contract.projectName,
        category: contract.category || '-',
        totalValue: contract.totalValue,
        signedDate: format(new Date(contract.signedDate), 'yyyy-MM-dd'),
        status: contract.status,
        totalReceivables,
        received,
        pending,
      }
    })

    // Prepare receivables data
    const receivablesData = contracts.flatMap(contract =>
      contract.receivables.map(receivable => {
        let actualStatus = receivable.status
        if (receivable.status === 'pending' && !receivable.receivedDate) {
          const expectedDate = new Date(receivable.expectedDate)
          expectedDate.setHours(0, 0, 0, 0)
          if (expectedDate < today) {
            actualStatus = 'overdue'
          }
        }

        return {
          clientName: contract.clientName,
          projectName: contract.projectName,
          expectedDate: format(new Date(receivable.expectedDate), 'yyyy-MM-dd'),
          amount: receivable.amount,
          category: receivable.category || '-',
          status: actualStatus,
          receivedDate: receivable.receivedDate ? format(new Date(receivable.receivedDate), 'yyyy-MM-dd') : '-',
          receivedAmount: receivable.receivedAmount || '-',
          invoiceNumber: receivable.invoiceNumber || '-',
        }
      })
    )

    // Prepare monthly cashflow data
    const allReceivables = contracts.flatMap(c =>
      c.receivables.map(r => ({
        ...r,
        clientName: c.clientName,
        projectName: c.projectName,
      }))
    )

    let monthlyData: any[] = []
    if (allReceivables.length > 0) {
      const firstDate = new Date(Math.min(...allReceivables.map(r => new Date(r.expectedDate).getTime())))
      const lastDate = new Date(Math.max(...allReceivables.map(r => new Date(r.expectedDate).getTime())))

      const months = eachMonthOfInterval({
        start: startOfMonth(firstDate),
        end: endOfMonth(addMonths(lastDate, 3)),
      })

      monthlyData = months.map(month => {
        const monthStart = startOfMonth(month)
        const monthEnd = endOfMonth(month)

        const monthReceivables = allReceivables.filter(r => {
          const date = new Date(r.expectedDate)
          return date >= monthStart && date <= monthEnd
        })

        const expected = monthReceivables.reduce((sum, r) => sum + r.amount, 0)
        const received = monthReceivables
          .filter(r => r.status === 'received')
          .reduce((sum, r) => sum + (r.receivedAmount || 0), 0)

        const pending = monthReceivables
          .filter(r => {
            if (r.status === 'received' || r.receivedDate) return false
            const expectedDate = new Date(r.expectedDate)
            expectedDate.setHours(0, 0, 0, 0)
            return expectedDate >= today
          })
          .reduce((sum, r) => sum + r.amount, 0)

        const overdue = monthReceivables
          .filter(r => {
            if (r.status === 'received' || r.receivedDate) return false
            const expectedDate = new Date(r.expectedDate)
            expectedDate.setHours(0, 0, 0, 0)
            return expectedDate < today
          })
          .reduce((sum, r) => sum + r.amount, 0)

        return {
          month: format(month, 'yyyy-MM'),
          expected,
          received,
          pending,
          overdue,
        }
      })
    }

    // Create Google Sheets
    const sheetsService = new GoogleSheetsService()
    const title = `ArqCashflow Report - ${format(new Date(), 'yyyy-MM-dd HH:mm')}`
    const spreadsheetId = await sheetsService.createSpreadsheet(title)

    // Populate the spreadsheet
    await sheetsService.populateSpreadsheet(spreadsheetId, {
      contracts: contractsData,
      receivables: receivablesData,
      monthlyData,
    })

    // Make spreadsheet public (optional - you might want to control this)
    await sheetsService.makeSpreadsheetPublic(spreadsheetId)

    const spreadsheetUrl = sheetsService.getSpreadsheetUrl(spreadsheetId)

    return NextResponse.json({
      success: true,
      spreadsheetId,
      url: spreadsheetUrl,
      message: 'Google Sheets report created successfully!',
    })

  } catch (error) {
    console.error('Google Sheets export error:', error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        return NextResponse.json(
          { error: 'Google Sheets API credentials are not properly configured.' },
          { status: 401 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return NextResponse.json(
          { error: 'Google Sheets API quota exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      // Expose the actual error for debugging (temporarily in production too)
      return NextResponse.json(
        { error: `Debug: ${error.message}`, details: error.toString() },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create Google Sheets report. Please check your configuration and try again.' },
      { status: 500 }
    )
  }
}