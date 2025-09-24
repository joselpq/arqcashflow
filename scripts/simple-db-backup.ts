#!/usr/bin/env npx tsx

/**
 * Simple Database Backup using Prisma
 * Creates a JSON backup of all critical data before service layer migration
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting database backup using Prisma...')

  try {
    // Create backup directory
    const backupDir = 'backups'
    mkdirSync(backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = join(backupDir, `arqcashflow_data_backup_${timestamp}.json`)

    console.log('📊 Fetching all data...')

    // Fetch all critical data
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        type: 'full-data-backup'
      },
      data: {
        users: await prisma.user.findMany(),
        teams: await prisma.team.findMany(),
        contracts: await prisma.contract.findMany(),
        receivables: await prisma.receivable.findMany(),
        expenses: await prisma.expense.findMany(),
        auditLogs: await prisma.auditLog.findMany({
          orderBy: { timestamp: 'desc' },
          take: 1000 // Last 1000 audit entries
        })
      },
      counts: {
        users: await prisma.user.count(),
        teams: await prisma.team.count(),
        contracts: await prisma.contract.count(),
        receivables: await prisma.receivable.count(),
        expenses: await prisma.expense.count(),
        auditLogs: await prisma.auditLog.count()
      }
    }

    // Write backup to file
    writeFileSync(backupFile, JSON.stringify(backup, null, 2))

    console.log('✅ Database backup completed successfully!')
    console.log(`📁 Backup saved to: ${backupFile}`)
    console.log(`📏 Record counts:`)
    console.log(`   Users: ${backup.counts.users}`)
    console.log(`   Teams: ${backup.counts.teams}`)
    console.log(`   Contracts: ${backup.counts.contracts}`)
    console.log(`   Receivables: ${backup.counts.receivables}`)
    console.log(`   Expenses: ${backup.counts.expenses}`)
    console.log(`   Audit logs: ${backup.counts.auditLogs}`)

    console.log('\n📋 Next steps:')
    console.log('1. Enable USE_SERVICE_LAYER=true to begin Phase 1 testing')
    console.log('2. Monitor /api/monitoring/health for error rates')
    console.log('3. Test contract endpoints for functionality')

    console.log('\n🎉 Ready to proceed with service layer migration Phase 1!')

  } catch (error) {
    console.error('❌ ERROR: Database backup failed!', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)