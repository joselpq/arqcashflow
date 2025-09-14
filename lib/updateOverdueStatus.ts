import { prisma } from './prisma'

export async function updateOverdueStatuses() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find all pending receivables that should be marked as overdue
    const overdueReceivables = await prisma.receivable.updateMany({
      where: {
        status: 'pending',
        receivedDate: null,
        expectedDate: {
          lt: today
        }
      },
      data: {
        status: 'overdue'
      }
    })

    console.log(`Updated ${overdueReceivables.count} receivables to overdue status`)
    return overdueReceivables.count
  } catch (error) {
    console.error('Error updating overdue statuses:', error)
    throw error
  }
}