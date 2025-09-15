import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    // Fetch all contracts with receivables and expenses (same logic as Excel export)
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Generate CSV content with multiple sheets separated by empty lines
    let csvContent = ''

    // Instructions at the top
    csvContent += '# ARQCASHFLOW EXPORT FOR GOOGLE SHEETS\n'
    csvContent += '# INSTRUCTIONS:\n'
    csvContent += '# 1. Save this file as .csv\n'
    csvContent += '# 2. Go to https://sheets.google.com/\n'
    csvContent += '# 3. Create new spreadsheet\n'
    csvContent += '# 4. File > Import > Upload this file\n'
    csvContent += '# 5. Choose "Replace spreadsheet" and "Detect automatically"\n'
    csvContent += '# 6. The data will be organized in sections below\n'
    csvContent += '\n'

    // Sheet 1: Contracts Overview
    csvContent += 'CONTRATOS\n'
    csvContent += 'Cliente,Projeto,Categoria,Valor Total,Data Assinatura,Status,Total Recebíveis,Recebido,Pendente,Total Despesas,Despesas Pagas\n'

    contracts.forEach(contract => {
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

      const totalExpenses = contract.expenses.reduce((sum, e) => sum + e.amount, 0)
      const paidExpenses = contract.expenses
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)

      csvContent += `"${contract.clientName}","${contract.projectName}","${contract.category || '-'}",${contract.totalValue},"${format(new Date(contract.signedDate), 'yyyy-MM-dd')}","${contract.status}",${totalReceivables},${received},${pending},${totalExpenses},${paidExpenses}\n`
    })

    csvContent += '\n\n'

    // Sheet 2: Receivables Detail
    csvContent += 'RECEBÍVEIS\n'
    csvContent += 'Cliente,Projeto,Data Esperada,Valor,Categoria,Status,Data Recebida,Valor Recebido,Nota Fiscal\n'

    contracts.forEach(contract => {
      contract.receivables.forEach(receivable => {
        let actualStatus = receivable.status
        if (receivable.status === 'pending' && !receivable.receivedDate) {
          const expectedDate = new Date(receivable.expectedDate)
          expectedDate.setHours(0, 0, 0, 0)
          if (expectedDate < today) {
            actualStatus = 'overdue'
          }
        }

        csvContent += `"${contract.clientName}","${contract.projectName}","${format(new Date(receivable.expectedDate), 'yyyy-MM-dd')}",${receivable.amount},"${receivable.category || '-'}","${actualStatus}","${receivable.receivedDate ? format(new Date(receivable.receivedDate), 'yyyy-MM-dd') : '-'}","${receivable.receivedAmount || '-'}","${receivable.invoiceNumber || '-'}"\n`
      })
    })

    csvContent += '\n\n'

    // Sheet 3: Expenses Detail
    csvContent += 'DESPESAS\n'
    csvContent += 'Projeto,Descrição,Categoria,Tipo,Valor,Data Vencimento,Status,Data Pagamento,Valor Pago,Fornecedor,Nota Fiscal\n'

    allExpenses.forEach(expense => {
      let actualStatus = expense.status
      if (expense.status === 'pending' && !expense.paidDate) {
        const dueDate = new Date(expense.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        if (dueDate < today) {
          actualStatus = 'overdue'
        }
      }

      const projectName = expense.contract
        ? `${expense.contract.clientName} - ${expense.contract.projectName}`
        : 'Geral'

      csvContent += `"${projectName}","${expense.description}","${expense.category}","${expense.type}",${expense.amount},"${format(new Date(expense.dueDate), 'yyyy-MM-dd')}","${actualStatus}","${expense.paidDate ? format(new Date(expense.paidDate), 'yyyy-MM-dd') : '-'}","${expense.paidAmount || '-'}","${expense.vendor || '-'}","${expense.invoiceNumber || '-'}"\n`
    })

    csvContent += '\n\n'

    // Sheet 4: Monthly Cashflow
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

      const allExpenseDates = allExpenses.map(e => new Date(e.dueDate))
      const earliestDate = allExpenseDates.length > 0
        ? new Date(Math.min(...allExpenseDates.map(d => d.getTime())))
        : firstDate
      const latestDate = allExpenseDates.length > 0
        ? new Date(Math.max(...allExpenseDates.map(d => d.getTime())))
        : lastDate

      const finalFirstDate = new Date(Math.min(firstDate.getTime(), earliestDate.getTime()))
      const finalLastDate = new Date(Math.max(lastDate.getTime(), latestDate.getTime()))

      const monthsRange = eachMonthOfInterval({
        start: startOfMonth(finalFirstDate),
        end: endOfMonth(addMonths(finalLastDate, 3)),
      })

      csvContent += 'FLUXO DE CAIXA MENSAL\n'
      csvContent += 'Mês,Receita Esperada,Receita Recebida,Receita Pendente,Receita Atrasada,Despesas Esperadas,Despesas Pagas,Despesas Pendentes,Fluxo Líquido\n'

      monthsRange.forEach(month => {
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

        const netCashflow = received - paidExpenses

        csvContent += `"${format(month, 'yyyy-MM')}",${expected},${received},${pending},${overdue},${expectedExpenses},${paidExpenses},${pendingExpenses},${netCashflow}\n`
      })
    }

    // Additional instructions at the bottom
    csvContent += '\n\n'
    csvContent += '# COMO USAR NO GOOGLE SHEETS:\n'
    csvContent += '# 1. Após importar, você verá 4 seções de dados\n'
    csvContent += '# 2. Selecione cada seção e cole em abas separadas\n'
    csvContent += '# 3. Formate as colunas de valores como moeda (R$)\n'
    csvContent += '# 4. Use filtros e gráficos conforme necessário\n'

    // Return as downloadable CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Disposition': `attachment; filename="arqcashflow_google_sheets_${format(new Date(), 'yyyy-MM-dd')}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json({ error: 'Failed to export data as CSV' }, { status: 500 })
  }
}