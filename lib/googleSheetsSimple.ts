// Ultra-simple Google Sheets integration using Google Identity Services
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

export class GoogleSheetsSimpleService {
  private isInitialized = false
  private accessToken: string | null = null

  // Use a default public client ID for demo purposes (can be overridden)
  private clientId: string

  constructor() {
    // Require environment variable - no fallback to avoid 400 errors
    this.clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Load Google Identity Services
    await this.loadGoogleIdentityServices()
    await this.loadGoogleAPI()

    this.isInitialized = true
  }

  private loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = () => {
        window.gapi.load('client', resolve)
      }
      script.onerror = () => reject(new Error('Failed to load Google API'))
      document.head.appendChild(script)
    })
  }

  async authenticate(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    return new Promise((resolve) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            console.error('Authentication error:', response.error)
            resolve(false)
            return
          }

          this.accessToken = response.access_token

          // Initialize gapi client with the access token
          window.gapi.client.init({
            apiKey: '', // Not needed when using access token
            discoveryDocs: [
              'https://sheets.googleapis.com/$discovery/rest?version=v4',
              'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
            ],
          }).then(() => {
            window.gapi.client.setToken({ access_token: this.accessToken })
            resolve(true)
          })
        },
      })

      tokenClient.requestAccessToken({ prompt: 'consent' })
    })
  }

  async createSpreadsheet(title: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    const response = await window.gapi.client.sheets.spreadsheets.create({
      properties: { title },
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
          properties: { title: 'Contracts', index: 0 },
        },
      },
      {
        addSheet: {
          properties: { title: 'Receivables', index: 1 },
        },
      },
      {
        addSheet: {
          properties: { title: 'Monthly Cashflow', index: 2 },
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
      'Client', 'Project', 'Category', 'Total Value', 'Signed Date',
      'Status', 'Total Receivables', 'Received', 'Pending',
    ]

    const rows = contracts.map(contract => [
      contract.clientName, contract.projectName, contract.category || '-',
      contract.totalValue, contract.signedDate, contract.status,
      contract.totalReceivables, contract.received, contract.pending,
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
      'Client', 'Project', 'Expected Date', 'Amount', 'Category',
      'Status', 'Received Date', 'Received Amount', 'Invoice #',
    ]

    const rows = receivables.map(receivable => [
      receivable.clientName, receivable.projectName, receivable.expectedDate,
      receivable.amount, receivable.category || '-', receivable.status,
      receivable.receivedDate || '-', receivable.receivedAmount || '-',
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
      data.month, data.expected, data.received, data.pending, data.overdue,
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
      ...Array.from({ length: 3 }, (_, sheetId) => ({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      })),
      // Format currency columns
      {
        repeatCell: {
          range: { sheetId: 0, startColumnIndex: 3, endColumnIndex: 4, startRowIndex: 1 },
          cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY' } } },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
      {
        repeatCell: {
          range: { sheetId: 0, startColumnIndex: 6, endColumnIndex: 9, startRowIndex: 1 },
          cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY' } } },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
    ]

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId, requests,
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
    }
  }

  getSpreadsheetUrl(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  isConfigured(): boolean {
    return !!this.clientId && this.clientId.includes('.apps.googleusercontent.com')
  }
}