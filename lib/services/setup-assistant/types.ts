/**
 * Shared type definitions for SetupAssistant components
 *
 * These types are used across multiple components in the setup-assistant
 * service decomposition (ADR-026).
 */

/**
 * Sheet data with CSV representation
 * Used for AI analysis and table segmentation
 */
export interface SheetData {
  name: string
  csv: string
}

/**
 * Virtual sheet created from a detected table (ADR-025)
 * Represents a single table within a mixed-entity sheet
 */
export interface VirtualSheet {
  name: string              // e.g., "Sheet1_table0", "Sheet1_table1"
  csv: string              // CSV data for just this table
  originalSheet: string     // Original sheet name
  tableIndex: number        // Index within original sheet
  rowRange: [number, number]  // Row range in original sheet
  colRange: [number, number]  // Column range in original sheet
  headerRow?: number        // Pre-detected header row (absolute index)
}

/**
 * File type detection results
 */
export type FileType = 'xlsx' | 'csv' | 'pdf' | 'image'

/**
 * Sheet extraction options for ExcelParser
 */
export interface SheetExtractionOptions {
  supportMixedSheets: boolean
  detectHeaders: boolean
}
