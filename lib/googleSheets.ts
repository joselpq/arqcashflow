import { google } from 'googleapis'
import { format } from 'date-fns'

export interface SheetData {
  contracts: any[]
  receivables: any[]
  monthlyData: any[]
}

export class GoogleSheetsService {
  private sheets
  private auth

  constructor() {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Google Sheets credentials not configured')
    }

    this.auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    )

    this.sheets = google.sheets({ version: 'v4', auth: this.auth })
  }

  async createSpreadsheet(title: string): Promise<string> {
    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
      },
    })

    return response.data.spreadsheetId!
  }

  async populateSpreadsheet(spreadsheetId: string, data: SheetData): Promise<void> {
    // First, clear existing sheets and create our custom sheets
    await this.setupSheets(spreadsheetId)

    // Populate each sheet
    await this.populateContractsSheet(spreadsheetId, data.contracts)
    await this.populateReceivablesSheet(spreadsheetId, data.receivables)
    await this.populateCashflowSheet(spreadsheetId, data.monthlyData)

    // Apply formatting
    await this.formatSheets(spreadsheetId)
  }

  private async setupSheets(spreadsheetId: string): Promise<void> {
    // Get current sheets
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const currentSheets = spreadsheet.data.sheets || []

    // Create new sheets
    const requests = [
      {
        addSheet: {
          properties: {
            title: 'Contracts',
            index: 0,
          },
        },
      },
      {
        addSheet: {
          properties: {
            title: 'Receivables',
            index: 1,
          },
        },
      },
      {
        addSheet: {
          properties: {
            title: 'Monthly Cashflow',
            index: 2,
          },
        },
      },
    ]

    // Delete default sheet if it exists
    const defaultSheet = currentSheets.find(sheet => sheet.properties?.title === 'Sheet1')
    if (defaultSheet) {
      requests.push({
        deleteSheet: {
          sheetId: defaultSheet.properties!.sheetId!,
        },
      })
    }

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    })
  }

  private async populateContractsSheet(spreadsheetId: string, contracts: any[]): Promise<void> {
    const headers = [
      'Client',
      'Project',
      'Category',
      'Total Value',
      'Signed Date',
      'Status',
      'Total Receivables',
      'Received',
      'Pending',
    ]

    const rows = contracts.map(contract => [
      contract.clientName,
      contract.projectName,
      contract.category || '-',
      contract.totalValue,
      contract.signedDate,
      contract.status,
      contract.totalReceivables,
      contract.received,
      contract.pending,
    ])

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Contracts!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows],
      },
    })
  }

  private async populateReceivablesSheet(spreadsheetId: string, receivables: any[]): Promise<void> {
    const headers = [
      'Client',
      'Project',
      'Expected Date',
      'Amount',
      'Category',
      'Status',
      'Received Date',
      'Received Amount',
      'Invoice #',
    ]

    const rows = receivables.map(receivable => [
      receivable.clientName,
      receivable.projectName,
      receivable.expectedDate,
      receivable.amount,
      receivable.category || '-',
      receivable.status,
      receivable.receivedDate || '-',
      receivable.receivedAmount || '-',
      receivable.invoiceNumber || '-',
    ])

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Receivables!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows],
      },
    })
  }

  private async populateCashflowSheet(spreadsheetId: string, monthlyData: any[]): Promise<void> {
    const headers = ['Month', 'Expected', 'Received', 'Pending', 'Overdue']

    const rows = monthlyData.map(data => [
      data.month,
      data.expected,
      data.received,
      data.pending,
      data.overdue,
    ])

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Monthly Cashflow!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows],
      },
    })
  }

  private async formatSheets(spreadsheetId: string): Promise<void> {
    const requests = [
      // Format headers for all sheets
      {
        repeatCell: {
          range: {
            sheetId: 0, // Contracts
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: 1, // Receivables
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: 2, // Monthly Cashflow
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      },
      // Format currency columns in Contracts sheet (columns D, G, H, I)
      {
        repeatCell: {
          range: {
            sheetId: 0,
            startColumnIndex: 3,
            endColumnIndex: 4,
            startRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: 0,
            startColumnIndex: 6,
            endColumnIndex: 9,
            startRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
      // Format currency columns in Receivables sheet (columns D, H)
      {
        repeatCell: {
          range: {
            sheetId: 1,
            startColumnIndex: 3,
            endColumnIndex: 4,
            startRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: 1,
            startColumnIndex: 7,
            endColumnIndex: 8,
            startRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
      // Format currency columns in Monthly Cashflow sheet (columns B, C, D, E)
      {
        repeatCell: {
          range: {
            sheetId: 2,
            startColumnIndex: 1,
            endColumnIndex: 5,
            startRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
    ]

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    })
  }

  async makeSpreadsheetPublic(spreadsheetId: string): Promise<void> {
    const drive = google.drive({ version: 'v3', auth: this.auth })

    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })
  }

  getSpreadsheetUrl(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  }
}