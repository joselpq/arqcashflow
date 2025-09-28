import * as XLSX from 'xlsx'
import fs from 'fs'

const buffer = fs.readFileSync('Testando.xlsx')
const workbook = XLSX.read(buffer, { type: 'buffer' })
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]
const csvData = XLSX.utils.sheet_to_csv(worksheet)
const lines = csvData.split('\n')

console.log('Project Analysis:')
const projects: Record<string, any[]> = {}

lines.forEach((line, i) => {
  const cols = line.split(',')
  if (cols[0] && cols[0].includes(' - ') && i > 1) {
    const parts = cols[0].split(' - ')
    const projectCode = parts[0].trim()
    const clientName = parts[1]?.trim()

    // Key by both client and project (what ContractService checks)
    const duplicateKey = `${clientName}_${projectCode}`

    if (!projects[duplicateKey]) {
      projects[duplicateKey] = []
    }

    projects[duplicateKey].push({
      line: i,
      full: cols[0],
      value: cols[2],
      projectCode,
      clientName
    })
  }
})

console.log('\nChecking for duplicates (clientName + projectName):')
let duplicateCount = 0

Object.keys(projects).forEach(key => {
  if (projects[key].length > 1) {
    duplicateCount++
    console.log(`\nDuplicate ${duplicateCount}: ${key}`)
    projects[key].forEach(p => {
      console.log(`  Line ${p.line}: "${p.clientName}" + "${p.projectCode}" - ${p.value}`)
    })
  }
})

if (duplicateCount === 0) {
  console.log('No duplicates found based on clientName + projectName combination')
} else {
  console.log(`\nTotal duplicates found: ${duplicateCount}`)
}

console.log(`\nTotal projects: ${Object.keys(projects).length}`)
console.log('All unique project combinations:')
Object.keys(projects).forEach(key => {
  const project = projects[key][0]
  console.log(`  "${project.clientName}" + "${project.projectCode}"`)
})