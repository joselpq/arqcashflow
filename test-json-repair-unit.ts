/**
 * Unit test for jsonrepair integration
 * Tests if the jsonrepair library successfully fixes malformed JSON from Claude
 */

import { jsonrepair } from 'jsonrepair'

// Simulated malformed JSON from Claude (missing comma between array elements)
const malformedJSON = `{
  "data": {
    "contracts": [
      {"clientName": "Client 1", "projectName": "Project 1"}
      {"clientName": "Client 2", "projectName": "Project 2"}
    ],
    "receivables": [
      {"amount": 1000, "dueDate": "2025-01-01"}
      {"amount": 2000, "dueDate": "2025-02-01"}
      {"amount": 3000, "dueDate": "2025-03-01"}
    ]
  }
}`

console.log('🧪 Testing jsonrepair library integration\n')
console.log('Malformed JSON (missing commas between array elements):')
console.log(malformedJSON.substring(0, 200) + '...\n')

try {
  console.log('Attempting to parse directly...')
  JSON.parse(malformedJSON)
  console.log('✅ Direct parse succeeded (unexpected!)')
} catch (e) {
  console.log('❌ Direct parse failed (expected)')
  console.log(`   Error: ${e instanceof Error ? e.message : String(e)}\n`)

  try {
    console.log('Attempting repair with jsonrepair...')
    const repaired = jsonrepair(malformedJSON)
    console.log('✅ jsonrepair succeeded!\n')

    console.log('Parsing repaired JSON...')
    const parsed = JSON.parse(repaired)
    console.log('✅ Parsed successfully!\n')

    console.log('Extracted data:')
    console.log(`   Contracts: ${parsed.data.contracts.length}`)
    console.log(`   Receivables: ${parsed.data.receivables.length}`)

    console.log('\n✅ TEST PASSED: jsonrepair library is working correctly!')
  } catch (repairError) {
    console.log('❌ jsonrepair failed')
    console.log(`   Error: ${repairError instanceof Error ? repairError.message : String(repairError)}`)
    console.log('\n❌ TEST FAILED')
    process.exit(1)
  }
}
