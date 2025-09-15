// Google Sheets integration using OAuth2 browser authentication
export interface SheetData {
  contracts: any[]
  receivables: any[]
  monthlyData: any[]
}

declare global {
  interface Window {
    google?: any
    gapi?: any
  }
}

export class GoogleSheetsOAuthService {
  private isInitialized = false
  private isSignedIn = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    return new Promise((resolve, reject) => {
      // Load Google API script
      if (!window.gapi) {
        const script = document.createElement('script')
        script.src = 'https://apis.google.com/js/api.js'
        script.onload = () => this.loadClient().then(resolve).catch(reject)
        script.onerror = () => reject(new Error('Failed to load Google API script'))
        document.head.appendChild(script)
      } else {
        this.loadClient().then(resolve).catch(reject)
      }
    })
  }

  private async loadClient(): Promise<void> {
    await new Promise<void>((resolve) => {
      window.gapi.load('client:auth2', resolve)
    })

    await window.gapi.client.init({
      apiKey: '', // Not needed for OAuth2
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      discoveryDocs: [
        'https://sheets.googleapis.com/$discovery/rest?version=v4',
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
      ],
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
    })

    this.isInitialized = true
    this.isSignedIn = window.gapi.auth2.getAuthInstance().isSignedIn.get()
  }

  async authenticate(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (this.isSignedIn) {
      return true
    }

    try {
      await window.gapi.auth2.getAuthInstance().signIn()
      this.isSignedIn = true
      return true
    } catch (error) {
      console.error('Authentication failed:', error)
      return false
    }
  }

  async createSpreadsheet(title: string): Promise<string> {
    if (!this.isSignedIn) {
      throw new Error('Not authenticated')
    }

    const response = await window.gapi.client.sheets.spreadsheets.create({
      properties: {
        title,
      },
    })

    return response.result.spreadsheetId
  }

  async populateSpreadsheet(spreadsheetId: string, data: SheetData): Promise<void> {
    // Setup sheets structure
    await this.setupSheets(spreadsheetId)

    // Populate each sheet
    await this.populateContractsSheet(spreadsheetId, data.contracts)
    await this.populateReceivablesSheet(spreadsheetId, data.receivables)
    await this.populateCashflowSheet(spreadsheetId, data.monthlyData)

    // Apply formatting
    await this.formatSheets(spreadsheetId)
  }

  private async setupSheets(spreadsheetId: string): Promise<void> {
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

    // Get current sheets to potentially delete default Sheet1
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    })

    const defaultSheet = spreadsheet.result.sheets?.find(
      (sheet: any) => sheet.properties?.title === 'Sheet1'
    )

    if (defaultSheet) {
      requests.push({
        deleteSheet: {
          sheetId: defaultSheet.properties.sheetId,
        },
      })
    }

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requests,
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

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Contracts!A1',
      valueInputOption: 'RAW',
      values: [headers, ...rows],
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

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Receivables!A1',
      valueInputOption: 'RAW',
      values: [headers, ...rows],
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

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Monthly Cashflow!A1',
      valueInputOption: 'RAW',
      values: [headers, ...rows],
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
      // Format currency columns in Contracts sheet
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
    ]

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requests,
    })
  }

  async makeSpreadsheetPublic(spreadsheetId: string): Promise<void> {
    try {
      await window.gapi.client.drive.permissions.create({
        fileId: spreadsheetId,
        role: 'reader',
        type: 'anyone',
      })
    } catch (error) {
      console.warn('Could not make spreadsheet public:', error)
      // Don't throw error - the spreadsheet will still be accessible to the authenticated user
    }
  }

  getSpreadsheetUrl(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  }

  isAuthenticated(): boolean {
    return this.isSignedIn
  }
}