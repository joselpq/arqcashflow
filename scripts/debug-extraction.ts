/**
 * Debug script to see exactly what Claude extracted and why receivables failed
 */

// Run the agent with detailed logging
import fs from 'fs'

const csvContent = fs.readFileSync('./sample_data.csv', 'utf-8')
console.log('📄 CSV Content:')
console.log(csvContent)

console.log('\n🔍 Looking for receivable entries:')
const lines = csvContent.split('\n')
const receivableLines = lines.filter(line => line.toLowerCase().includes('recebivel'))
console.log('Receivable lines found:', receivableLines.length)
receivableLines.forEach((line, index) => {
  console.log(`${index + 1}. ${line}`)
})

// Let's create a minimal test to see what Claude would extract
console.log('\n🧪 Expected entity structure for receivables:')
console.log(`
{
  "type": "receivable",
  "confidence": 0.9,
  "data": {
    "expectedDate": "2024-04-30",  // Must be YYYY-MM-DD
    "amount": 25000,              // Must be positive number
    "description": "...",         // Optional
    "category": "project work"    // Optional
  }
}
`)

// Check individual receivable from CSV
const sampleReceivable = 'Recebivel,LF - Livia Assan,Primeira parcela projeto LF,25000,30/04/2024,Residencial,Pendente,,INV-2024-001,"Aguardando aprovacao final do cliente"'
console.log('\n📋 Sample receivable line:')
console.log(sampleReceivable)

const parts = sampleReceivable.split(',')
console.log('📊 Parsed fields:')
console.log('- Type:', parts[0])
console.log('- Client:', parts[1])
console.log('- Description:', parts[2])
console.log('- Amount:', parts[3])
console.log('- Date:', parts[4], '(needs conversion to YYYY-MM-DD)')
console.log('- Category:', parts[5])
console.log('- Status:', parts[6])