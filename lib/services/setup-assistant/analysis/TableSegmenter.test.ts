/**
 * TableSegmenter Tests - ADR-026 Phase 1.4
 *
 * Comprehensive test suite for table boundary detection and segmentation.
 * Tests cover:
 * - Blank row/column detection
 * - Boundary confidence scoring
 * - Table segmentation (homogeneous and mixed)
 * - Virtual sheet creation
 * - Header detection within regions
 * - Edge cases and malformed data
 */

import { TableSegmenter } from './TableSegmenter'
import type { SheetData } from '../types'

describe('TableSegmenter', () => {
  let segmenter: TableSegmenter

  beforeEach(() => {
    segmenter = new TableSegmenter()
  })

  describe('detectBlankRows', () => {
    it('detects single blank row boundary', () => {
      const rows = [
        ['A1', 'B1', 'C1'],
        ['A2', 'B2', 'C2'],
        ['', '', ''],  // Blank
        ['A4', 'B4', 'C4'],
      ]

      const boundaries = segmenter.detectBlankRows(rows)

      expect(boundaries).toHaveLength(1)
      expect(boundaries[0]).toMatchObject({
        type: 'vertical',
        position: 2,
        confidence: 0.5,  // 1 blank row = 0.5 confidence
        blankLength: 1
      })
    })

    it('detects multiple blank row sequences', () => {
      const rows = [
        ['A1', 'B1'],
        ['', ''],
        ['', ''],  // 2 blank rows
        ['A4', 'B4'],
        ['', ''],
        ['', ''],
        ['', ''],  // 3 blank rows
        ['A8', 'B8'],
      ]

      const boundaries = segmenter.detectBlankRows(rows)

      expect(boundaries).toHaveLength(2)
      expect(boundaries[0].blankLength).toBe(2)
      expect(boundaries[0].confidence).toBe(1.0)  // 2+ blank rows = max confidence
      expect(boundaries[1].blankLength).toBe(3)
      expect(boundaries[1].confidence).toBe(1.0)
    })

    it('filters low-confidence boundaries', () => {
      const rows = [
        ['A1', 'B1'],
        ['', ''],  // Just 1 blank = 0.5 confidence (marginal)
        ['A3', 'B3'],
      ]

      const boundaries = segmenter.detectBlankRows(rows)

      expect(boundaries).toHaveLength(1)
      expect(boundaries[0].confidence).toBeGreaterThanOrEqual(0.5)
    })

    it('handles rows with only commas as blank', () => {
      const rows = [
        ['A1', 'B1'],
        [',', ',,', ''],  // Should be detected as blank
        ['A3', 'B3'],
      ]

      const boundaries = segmenter.detectBlankRows(rows)

      expect(boundaries).toHaveLength(1)
    })

    it('returns empty array for no boundaries', () => {
      const rows = [
        ['A1', 'B1'],
        ['A2', 'B2'],
        ['A3', 'B3'],
      ]

      const boundaries = segmenter.detectBlankRows(rows)

      expect(boundaries).toHaveLength(0)
    })
  })

  describe('detectBlankColumns', () => {
    it('detects single blank column', () => {
      const rows = [
        ['A1', '', 'C1'],
        ['A2', '', 'C2'],
        ['A3', '', 'C3'],
      ]

      const boundaries = segmenter.detectBlankColumns(rows)

      expect(boundaries).toHaveLength(1)
      expect(boundaries[0]).toMatchObject({
        type: 'horizontal',
        position: 1,
        confidence: expect.any(Number),
        blankLength: 1
      })
    })

    it('detects multiple blank column sequences', () => {
      const rows = [
        ['A', '', '', 'D', '', 'F'],
        ['A', '', '', 'D', '', 'F'],
        ['A', '', '', 'D', '', 'F'],
      ]

      const boundaries = segmenter.detectBlankColumns(rows)

      expect(boundaries.length).toBeGreaterThan(0)
      expect(boundaries.every(b => b.type === 'horizontal')).toBe(true)
    })

    it('handles partially filled columns (95% threshold)', () => {
      const rows = Array(20).fill(null).map((_, i) => [
        'A' + i,
        i === 0 ? 'B0' : '',  // Only 1 filled cell = 5% = should be blank
        'C' + i
      ])

      const boundaries = segmenter.detectBlankColumns(rows)

      expect(boundaries.some(b => b.position === 1)).toBe(true)
    })

    it('returns empty array for no blank columns', () => {
      const rows = [
        ['A1', 'B1', 'C1'],
        ['A2', 'B2', 'C2'],
      ]

      const boundaries = segmenter.detectBlankColumns(rows)

      expect(boundaries).toHaveLength(0)
    })

    it('handles empty rows array', () => {
      const boundaries = segmenter.detectBlankColumns([])

      expect(boundaries).toHaveLength(0)
    })
  })

  describe('segmentTablesWithHeaders', () => {
    it('returns single table for homogeneous sheet', () => {
      const sheet: SheetData = {
        name: 'Contracts',
        csv: 'Project,Client,Value\nProject 1,Client A,1000\nProject 2,Client B,2000'
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      expect(tables).toHaveLength(1)
      expect(tables[0]).toMatchObject({
        rowRange: [0, 2],
        colRange: [0, 2],
        confidence: 1.0  // Homogeneous = max confidence
      })
    })

    it('detects multiple tables in mixed sheet (vertical split)', () => {
      const sheet: SheetData = {
        name: 'Mixed',
        csv: [
          'Contracts,Client,Value',
          'Project 1,Client A,1000',
          '',
          '',
          'Receivables,Amount,Date',
          'Payment 1,500,2024-01-01',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      expect(tables.length).toBeGreaterThan(1)
      expect(tables[0].rowRange[1]).toBeLessThan(tables[1].rowRange[0])
    })

    it('detects header row within each table', () => {
      const sheet: SheetData = {
        name: 'WithHeaders',
        csv: [
          'Title: My Sheet',
          'Project Name,Client,Value',  // Header row
          'Project 1,Client A,1000',
          'Project 2,Client B,2000',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      expect(tables).toHaveLength(1)
      expect(tables[0].headerRow).toBeDefined()
      expect(tables[0].headerRow).toBeGreaterThanOrEqual(0)
    })

    it('calculates confidence scores correctly', () => {
      const sheet: SheetData = {
        name: 'TestSheet',
        csv: 'Name,Value\nRow1,100\nRow2,200\nRow3,300'
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      expect(tables[0].confidence).toBeGreaterThan(0.5)
      // High confidence: has header + multiple data rows + multiple columns
    })

    it('filters very low confidence regions', () => {
      const sheet: SheetData = {
        name: 'Sparse',
        csv: [
          'X',
          '',
          '',
          'Y',  // Only 2 rows total, low confidence
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      // Very sparse data should be filtered out or have single table
      tables.forEach(table => {
        expect(table.confidence).toBeGreaterThanOrEqual(0.3)
      })
    })

    it('handles empty CSV', () => {
      const sheet: SheetData = {
        name: 'Empty',
        csv: ''
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      expect(tables).toHaveLength(0)
    })

    it('logs diagnostic info for mixed sheets', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const sheet: SheetData = {
        name: 'Mixed',
        csv: [
          'Table 1',
          'A,B',
          '',
          '',
          'Table 2',
          'C,D',
        ].join('\n')
      }

      segmenter.segmentTablesWithHeaders(sheet)

      // Should log when multiple tables detected
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('extractTableAsSheet', () => {
    it('creates virtual sheet from detected table', () => {
      const sheet: SheetData = {
        name: 'OriginalSheet',
        csv: [
          'Name,Value',
          'Row1,100',
          '',
          '',
          'Other,Data',
          'Row2,200',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)
      const virtualSheet = segmenter.extractTableAsSheet(sheet, tables[0], 0)

      expect(virtualSheet).toMatchObject({
        name: 'OriginalSheet_table0',
        originalSheet: 'OriginalSheet',
        tableIndex: 0,
        rowRange: tables[0].rowRange,
        colRange: tables[0].colRange
      })

      expect(virtualSheet.csv).toContain('Name,Value')
      expect(virtualSheet.csv.split('\n').length).toBeGreaterThan(0)
    })

    it('uses detected header row', () => {
      const sheet: SheetData = {
        name: 'Sheet1',
        csv: [
          'Title Row',
          'Header,Columns,Here',
          'Data1,Data2,Data3',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)
      const virtualSheet = segmenter.extractTableAsSheet(sheet, tables[0], 0)

      // Header should be included in virtual sheet
      const lines = virtualSheet.csv.split('\n')
      expect(lines[0]).toContain('Header')
    })

    it('handles horizontal table splits (column ranges)', () => {
      const sheet: SheetData = {
        name: 'Wide',
        csv: 'A,B,,D,E\n1,2,,4,5'
      }

      // Manually create a table with column range [0, 1]
      const table = {
        rowRange: [0, 1] as [number, number],
        colRange: [0, 1] as [number, number],
        sampleRows: [['A', 'B'], ['1', '2']],
        confidence: 0.8
      }

      const virtualSheet = segmenter.extractTableAsSheet(sheet, table, 0)

      expect(virtualSheet.colRange).toEqual([0, 1])
      expect(virtualSheet.csv).not.toContain('D')
      expect(virtualSheet.csv).not.toContain('E')
    })

    it('escapes CSV values correctly', () => {
      const sheet: SheetData = {
        name: 'Special',
        csv: [
          'Name,Description',
          'Test,"Value with, comma"',
          'Test2,"Value with ""quotes"""',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)
      const virtualSheet = segmenter.extractTableAsSheet(sheet, tables[0], 0)

      // Should maintain proper CSV escaping
      expect(virtualSheet.csv).toContain('"')
      // Should be valid CSV format
      expect(virtualSheet.csv.split('\n').every(line => line.split(',').length <= 2)).toBe(true)
    })

    it('handles missing header row gracefully', () => {
      const sheet: SheetData = {
        name: 'NoHeader',
        csv: '1,2,3\n4,5,6\n7,8,9'
      }

      const table = {
        rowRange: [0, 2] as [number, number],
        colRange: [0, 2] as [number, number],
        sampleRows: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']],
        confidence: 0.7
        // No headerRow defined
      }

      const virtualSheet = segmenter.extractTableAsSheet(sheet, table, 0)

      // First row should become header by default
      const lines = virtualSheet.csv.split('\n')
      expect(lines[0]).toBe('1,2,3')
      expect(lines.length).toBeGreaterThan(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles sheets with only headers', () => {
      const sheet: SheetData = {
        name: 'HeaderOnly',
        csv: 'Name,Value,Date'
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      // Should not create table (need header + data)
      expect(tables.length).toBeLessThanOrEqual(1)
      if (tables.length === 1) {
        expect(tables[0].confidence).toBeLessThan(0.5)
      }
    })

    it('handles irregular column counts', () => {
      const sheet: SheetData = {
        name: 'Irregular',
        csv: [
          'A,B,C',
          'A,B',        // Missing column
          'A,B,C,D,E',  // Extra columns
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      // Should still segment without crashing
      expect(tables).toBeDefined()
      expect(Array.isArray(tables)).toBe(true)
    })

    it('handles very large sheets efficiently', () => {
      const largeSheet: SheetData = {
        name: 'Large',
        csv: Array(1000).fill(null).map((_, i) =>
          `Row${i},Value${i},${i * 100}`
        ).join('\n')
      }

      const start = Date.now()
      const tables = segmenter.segmentTablesWithHeaders(largeSheet)
      const duration = Date.now() - start

      expect(tables).toBeDefined()
      expect(duration).toBeLessThan(1000)  // Should complete in <1 second
    })

    it('handles sheets with unicode characters', () => {
      const sheet: SheetData = {
        name: 'Unicode',
        csv: [
          'Nome,Descrição,Valor',
          'Café,Projeto não realizado,R$ 1.500,50',
          'José,Pagamento açúcar,€ 200',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)
      const virtualSheet = segmenter.extractTableAsSheet(sheet, tables[0], 0)

      expect(virtualSheet.csv).toContain('Café')
      expect(virtualSheet.csv).toContain('José')
      expect(virtualSheet.csv).toContain('Descrição')
    })

    it('handles sheets with special CSV characters', () => {
      const sheet: SheetData = {
        name: 'Special',
        csv: [
          'Name,Value',
          '"Item with, comma",100',
          '"Item with ""quotes""",200',
          'Item with\nnewline,300',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      expect(tables).toBeDefined()
      expect(() => segmenter.extractTableAsSheet(sheet, tables[0], 0)).not.toThrow()
    })
  })

  describe('ADR-025 Mixed Sheet Scenarios', () => {
    it('handles contracts + receivables in one sheet (vertical)', () => {
      const sheet: SheetData = {
        name: 'Mixed_Vertical',
        csv: [
          'Project,Client,Total Value',
          'Project A,Client 1,10000',
          'Project B,Client 2,20000',
          '',
          '',
          'Receivable,Amount,Date',
          'Payment 1,5000,2024-01-01',
          'Payment 2,5000,2024-02-01',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      expect(tables.length).toBeGreaterThanOrEqual(2)

      // First table should be contracts
      expect(tables[0].rowRange[0]).toBe(0)
      expect(tables[0].rowRange[1]).toBeLessThan(4)

      // Second table should be receivables
      expect(tables[1].rowRange[0]).toBeGreaterThan(3)
    })

    it('handles side-by-side tables (horizontal)', () => {
      const sheet: SheetData = {
        name: 'Mixed_Horizontal',
        csv: [
          'Contracts,Value,,Receivables,Amount',
          'Project A,1000,,Payment 1,500',
          'Project B,2000,,Payment 2,1000',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      expect(tables.length).toBeGreaterThanOrEqual(2)

      // Tables should have different column ranges
      const colRanges = tables.map(t => t.colRange)
      expect(colRanges[0][1]).toBeLessThan(colRanges[1][0])
    })

    it('handles complex mixed layout (2x2 grid)', () => {
      const sheet: SheetData = {
        name: 'Complex',
        csv: [
          'Contracts,Value,,Receivables,Amount',
          'Project A,1000,,Payment 1,500',
          '',
          '',
          'Expenses,Cost,,Notes,Description',
          'Expense 1,300,,Note 1,Important',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      // Should detect 4 quadrants (or at least multiple tables)
      expect(tables.length).toBeGreaterThan(2)

      // All tables should have reasonable confidence
      tables.forEach(table => {
        expect(table.confidence).toBeGreaterThan(0.3)
      })
    })

    it('maintains confidence scores for mixed detection', () => {
      const sheet: SheetData = {
        name: 'MixedConfidence',
        csv: [
          'Good Header,With,Multiple,Columns',
          'Data1,Data2,Data3,Data4',
          'Data1,Data2,Data3,Data4',
          'Data1,Data2,Data3,Data4',
          '',
          '',
          'Poor',  // Only 1 column, low confidence
          'X',
        ].join('\n')
      }

      const tables = segmenter.segmentTablesWithHeaders(sheet)

      // First table should have high confidence
      expect(tables[0].confidence).toBeGreaterThan(0.7)

      // Second table (if detected) should have lower confidence
      if (tables.length > 1) {
        expect(tables[1].confidence).toBeLessThan(tables[0].confidence)
      }
    })
  })
})
