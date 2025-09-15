import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Fetch all contracts with receivables and expenses
    const contracts = await prisma.contract.findMany({
      include: {
        receivables: {
          orderBy: {
            expectedDate: 'asc',
          },
        },
        expenses: {
          orderBy: {
            dueDate: 'asc',
          },
        },
      },
      orderBy: {
        signedDate: 'desc',
      },
    })

    // Fetch all expenses (including non-project ones)
    const allExpenses = await prisma.expense.findMany({
      include: {
        contract: {
          select: {
            clientName: true,
            projectName: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    })

    // Create workbook
    const workbook = new ExcelJS.Workbook()

    // Sheet 1: Contracts Overview
    const contractsSheet = workbook.addWorksheet('Contracts')
    contractsSheet.columns = [
      { header: 'Client', key: 'clientName', width: 20 },
      { header: 'Project', key: 'projectName', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Total Value', key: 'totalValue', width: 15 },
      { header: 'Signed Date', key: 'signedDate', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Total Receivables', key: 'totalReceivables', width: 15 },
      { header: 'Received', key: 'received', width: 15 },
      { header: 'Pending', key: 'pending', width: 15 },
      { header: 'Total Expenses', key: 'totalExpenses', width: 15 },
      { header: 'Paid Expenses', key: 'paidExpenses', width: 15 },
    ]

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    contracts.forEach(contract => {
      const totalReceivables = contract.receivables.reduce((sum, r) => sum + r.amount, 0)
      const received = contract.receivables
        .filter(r => r.status === 'received')
        .reduce((sum, r) => sum + (r.receivedAmount || 0), 0)

      // Calculate pending (not overdue, not received)
      const pending = contract.receivables
        .filter(r => {
          if (r.status === 'received' || r.receivedDate) return false
          const expectedDate = new Date(r.expectedDate)
          expectedDate.setHours(0, 0, 0, 0)
          return expectedDate >= today
        })
        .reduce((sum, r) => sum + r.amount, 0)

      // Calculate expenses for this contract
      const totalExpenses = contract.expenses.reduce((sum, e) => sum + e.amount, 0)
      const paidExpenses = contract.expenses
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)

      contractsSheet.addRow({
        clientName: contract.clientName,
        projectName: contract.projectName,
        category: contract.category || '-',
        totalValue: contract.totalValue,
        signedDate: format(new Date(contract.signedDate), 'yyyy-MM-dd'),
        status: contract.status,
        totalReceivables,
        received,
        pending,
        totalExpenses,
        paidExpenses,
      })
    })

    // Format currency columns (D, G, H, I, J, K)
    const currencyColumns = ['D', 'G', 'H', 'I', 'J', 'K']
    currencyColumns.forEach(col => {
      const column = contractsSheet.getColumn(col)
      if (column) {
        column.numFmt = '$#,##0.00'
      }
    })

    // Sheet 2: Receivables Detail
    const receivablesSheet = workbook.addWorksheet('Receivables')
    receivablesSheet.columns = [
      { header: 'Client', key: 'clientName', width: 20 },
      { header: 'Project', key: 'projectName', width: 25 },
      { header: 'Expected Date', key: 'expectedDate', width: 12 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Received Date', key: 'receivedDate', width: 12 },
      { header: 'Received Amount', key: 'receivedAmount', width: 15 },
      { header: 'Invoice #', key: 'invoiceNumber', width: 15 },
    ]

    contracts.forEach(contract => {
      contract.receivables.forEach(receivable => {
        // Determine actual status based on dates
        let actualStatus = receivable.status
        if (receivable.status === 'pending' && !receivable.receivedDate) {
          const expectedDate = new Date(receivable.expectedDate)
          expectedDate.setHours(0, 0, 0, 0)
          if (expectedDate < today) {
            actualStatus = 'overdue'
          }
        }

        receivablesSheet.addRow({
          clientName: contract.clientName,
          projectName: contract.projectName,
          expectedDate: format(new Date(receivable.expectedDate), 'yyyy-MM-dd'),
          amount: receivable.amount,
          category: receivable.category || '-',
          status: actualStatus,
          receivedDate: receivable.receivedDate ? format(new Date(receivable.receivedDate), 'yyyy-MM-dd') : '-',
          receivedAmount: receivable.receivedAmount || '-',
          invoiceNumber: receivable.invoiceNumber || '-',
        })
      })
    })

    const receivablesColumnD = receivablesSheet.getColumn('D') // Amount
    const receivablesColumnH = receivablesSheet.getColumn('H') // Received Amount
    if (receivablesColumnD) receivablesColumnD.numFmt = '$#,##0.00'
    if (receivablesColumnH) receivablesColumnH.numFmt = '$#,##0.00'

    // Sheet 3: Expenses Detail
    const expensesSheet = workbook.addWorksheet('Expenses')
    expensesSheet.columns = [
      { header: 'Project', key: 'projectName', width: 25 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Paid Date', key: 'paidDate', width: 12 },
      { header: 'Paid Amount', key: 'paidAmount', width: 15 },
      { header: 'Vendor', key: 'vendor', width: 20 },
      { header: 'Invoice #', key: 'invoiceNumber', width: 15 },
    ]

    allExpenses.forEach(expense => {
      // Determine actual status based on dates
      let actualStatus = expense.status
      if (expense.status === 'pending' && !expense.paidDate) {
        const dueDate = new Date(expense.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        if (dueDate < today) {
          actualStatus = 'overdue'
        }
      }

      expensesSheet.addRow({
        projectName: expense.contract
          ? `${expense.contract.clientName} - ${expense.contract.projectName}`
          : 'General',
        description: expense.description,
        category: expense.category,
        type: expense.type,
        amount: expense.amount,
        dueDate: format(new Date(expense.dueDate), 'yyyy-MM-dd'),
        status: actualStatus,
        paidDate: expense.paidDate ? format(new Date(expense.paidDate), 'yyyy-MM-dd') : '-',
        paidAmount: expense.paidAmount || '-',
        vendor: expense.vendor || '-',
        invoiceNumber: expense.invoiceNumber || '-',
      })
    })

    const expensesColumnE = expensesSheet.getColumn('E') // Amount
    const expensesColumnI = expensesSheet.getColumn('I') // Paid Amount
    if (expensesColumnE) expensesColumnE.numFmt = '$#,##0.00'
    if (expensesColumnI) expensesColumnI.numFmt = '$#,##0.00'

    // Sheet 4: Monthly Cashflow (Updated to include expenses)
    const cashflowSheet = workbook.addWorksheet('Monthly Cashflow')

    // Today's date for overdue calculation (already defined above)
    // const today = new Date() - already defined at line 43

    // Calculate monthly cashflow
    const allReceivables = contracts.flatMap(c =>
      c.receivables.map(r => ({
        ...r,
        clientName: c.clientName,
        projectName: c.projectName,
      }))
    )

    if (allReceivables.length > 0) {
      const firstDate = new Date(Math.min(...allReceivables.map(r => new Date(r.expectedDate).getTime())))
      const lastDate = new Date(Math.max(...allReceivables.map(r => new Date(r.expectedDate).getTime())))

      const months = eachMonthOfInterval({
        start: startOfMonth(firstDate),
        end: endOfMonth(addMonths(lastDate, 3)), // Show 3 months ahead
      })

      // Get date range for expenses too
      const allExpenseDates = allExpenses.map(e => new Date(e.dueDate))
      const earliestDate = allExpenseDates.length > 0
        ? new Date(Math.min(...allExpenseDates.map(d => d.getTime())))
        : firstDate
      const latestDate = allExpenseDates.length > 0
        ? new Date(Math.max(...allExpenseDates.map(d => d.getTime())))
        : lastDate

      // Use the broader date range
      const finalFirstDate = new Date(Math.min(firstDate.getTime(), earliestDate.getTime()))
      const finalLastDate = new Date(Math.max(lastDate.getTime(), latestDate.getTime()))

      const months = eachMonthOfInterval({
        start: startOfMonth(finalFirstDate),
        end: endOfMonth(addMonths(finalLastDate, 3)), // Show 3 months ahead
      })

      // Setup columns
      const columns = [
        { header: 'Month', key: 'month', width: 15 },
        { header: 'Expected Income', key: 'expected', width: 15 },
        { header: 'Received Income', key: 'received', width: 15 },
        { header: 'Pending Income', key: 'pending', width: 15 },
        { header: 'Overdue Income', key: 'overdue', width: 15 },
        { header: 'Expected Expenses', key: 'expectedExpenses', width: 15 },
        { header: 'Paid Expenses', key: 'paidExpenses', width: 15 },
        { header: 'Pending Expenses', key: 'pendingExpenses', width: 15 },
        { header: 'Net Cashflow', key: 'netCashflow', width: 15 },
      ]
      cashflowSheet.columns = columns

      // Add data for each month
      months.forEach(month => {
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

        // Separate pending and overdue based on current date
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

        // Calculate expenses for this month
        const monthExpenses = allExpenses.filter(e => {
          const date = new Date(e.dueDate)
          return date >= monthStart && date <= monthEnd
        })

        const expectedExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
        const paidExpenses = monthExpenses
          .filter(e => e.status === 'paid')
          .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)
        const pendingExpenses = monthExpenses
          .filter(e => e.status === 'pending')
          .reduce((sum, e) => sum + e.amount, 0)

        // Calculate net cashflow (received income - paid expenses)
        const netCashflow = received - paidExpenses

        cashflowSheet.addRow({
          month: format(month, 'yyyy-MM'),
          expected,
          received,
          pending,
          overdue,
          expectedExpenses,
          paidExpenses,
          pendingExpenses,
          netCashflow,
        })
      })

      // Format currency columns - only if columns exist
      if (cashflowSheet.columns && cashflowSheet.columns.length > 1) {
        ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
          const column = cashflowSheet.getColumn(col)
          if (column) {
            column.numFmt = '$#,##0.00'
          }
        })
      }
    }

    // Apply styling to all sheets
    workbook.worksheets.forEach(sheet => {
      // Style header row
      sheet.getRow(1).font = { bold: true }
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }
      sheet.getRow(1).alignment = { horizontal: 'center' }

      // Add borders
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        })
      })
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Return as file download
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="cashflow_${format(new Date(), 'yyyy-MM-dd')}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}