/**
 * Script to create a mixed entity sheet for testing ADR-025 implementation
 * Creates an Excel file with 3 tables in one sheet:
 * 1. Contracts (rows 1-5)
 * 2. [Blank rows 6-7]
 * 3. Receivables (rows 8-15)
 * 4. [Blank rows 16-17]
 * 5. Expenses (rows 18-25)
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// Table 1: CONTRACTS
const contractsData = [
  ['Contratos - Projetos Ativos', '', '', '', ''],
  ['Nome do Cliente', 'Nome do Projeto', 'Valor Total', 'Data de Assinatura', 'Status'],
  ['Maria Silva Arquitetura', 'Residência Jardim Europa', 'R$ 45.000,00', '15/01/2024', 'Ativo'],
  ['João Santos Construtora', 'Edifício Comercial Centro', 'R$ 120.000,00', '20/02/2024', 'Ativo'],
  ['Ana Costa Design', 'Reforma Apartamento Copacabana', 'R$ 28.000,00', '10/03/2024', 'Ativo']
]

// Blank rows (separator)
const blankRows1 = [
  ['', '', '', '', ''],
  ['', '', '', '', '']
]

// Table 2: RECEIVABLES
const receivablesData = [
  ['Recebíveis - Parcelas a Receber', '', '', '', '', ''],
  ['Nome do Projeto', 'Valor', 'Data Esperada', 'Status', 'Data Recebimento', 'Valor Recebido'],
  ['Residência Jardim Europa', 'R$ 15.000,00', '15/04/2024', 'Recebido', '14/04/2024', 'R$ 15.000,00'],
  ['Residência Jardim Europa', 'R$ 15.000,00', '15/05/2024', 'Pendente', '', ''],
  ['Edifício Comercial Centro', 'R$ 40.000,00', '20/03/2024', 'Recebido', '18/03/2024', 'R$ 40.000,00'],
  ['Edifício Comercial Centro', 'R$ 40.000,00', '20/04/2024', 'Pendente', '', ''],
  ['Reforma Apartamento Copacabana', 'R$ 14.000,00', '10/04/2024', 'Recebido', '10/04/2024', 'R$ 14.000,00'],
  ['Reforma Apartamento Copacabana', 'R$ 14.000,00', '10/05/2024', 'Pendente', '', '']
]

// Blank rows (separator)
const blankRows2 = [
  ['', '', '', '', '', ''],
  ['', '', '', '', '', '']
]

// Table 3: EXPENSES
const expensesData = [
  ['Despesas - Contas a Pagar', '', '', '', '', ''],
  ['Descrição', 'Valor', 'Data Vencimento', 'Categoria', 'Status', 'Data Pagamento'],
  ['Aluguel Escritório Março', 'R$ 3.500,00', '10/03/2024', 'Aluguel', 'Pago', '08/03/2024'],
  ['Software AutoCAD - Licença', 'R$ 2.800,00', '15/03/2024', 'Software', 'Pago', '15/03/2024'],
  ['Energia Elétrica Março', 'R$ 450,00', '20/03/2024', 'Utilidades', 'Pago', '19/03/2024'],
  ['Internet Fibra Óptica', 'R$ 199,00', '25/03/2024', 'Utilidades', 'Pendente', ''],
  ['Material de Escritório', 'R$ 320,00', '30/03/2024', 'Outros', 'Pendente', ''],
  ['Aluguel Escritório Abril', 'R$ 3.500,00', '10/04/2024', 'Aluguel', 'Pendente', '']
]

// Combine all data into one sheet
const allData = [
  ...contractsData,
  ...blankRows1,
  ...receivablesData,
  ...blankRows2,
  ...expensesData
]

// Create workbook and worksheet
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet(allData)

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Financeiro Completo')

// Write to file
const outputPath = path.join(process.cwd(), 'teste_mixed_sheet_vertical.xlsx')
XLSX.writeFile(wb, outputPath)

console.log('✅ Test file created successfully!')
console.log(`📁 Location: ${outputPath}`)
console.log('\n📊 File Structure:')
console.log('   Rows 1-5:   Contracts (3 contracts)')
console.log('   Rows 6-7:   [BLANK SEPARATOR]')
console.log('   Rows 8-15:  Receivables (6 receivables)')
console.log('   Rows 16-17: [BLANK SEPARATOR]')
console.log('   Rows 18-25: Expenses (6 expenses)')
console.log('\n🎯 Expected Detection:')
console.log('   - 3 tables detected')
console.log('   - Parallel analysis of all 3 tables')
console.log('   - Combined result: 3 contracts + 6 receivables + 6 expenses')
console.log('\n🚀 Upload this file to test mixed sheet support!')
