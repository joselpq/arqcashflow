/**
 * FileTypeDetector - File Type Detection and Validation
 *
 * Responsibilities:
 * - Detect file type from extension and magic bytes
 * - Validate supported file types
 * - Return FileType enum
 *
 * Extracted from SetupAssistantServiceV2.ts (lines 212-232)
 * Part of ADR-026: SetupAssistant Service Decomposition
 */

import { ServiceError } from '../BaseService'
import type { FileType } from '../SetupAssistantService'

/**
 * Detects file type from filename extension and buffer magic bytes
 *
 * Supported formats:
 * - XLSX/XLS: Excel spreadsheets
 * - CSV: Comma-separated values
 * - PDF: Portable Document Format
 * - Images: PNG, JPG, JPEG, GIF, WebP
 */
export class FileTypeDetector {
  /**
   * Detect file type from filename and buffer content
   *
   * @param filename - Original filename with extension
   * @param buffer - File buffer for magic byte detection
   * @returns FileType enum value
   * @throws ServiceError if file type is not supported
   */
  detectFileType(filename: string, buffer: Buffer): FileType {
    // Try extension-based detection first
    const typeFromExtension = this.detectFromExtension(filename)
    if (typeFromExtension) {
      return typeFromExtension
    }

    // Fallback to magic byte detection
    const typeFromMagicBytes = this.detectFromMagicBytes(buffer)
    if (typeFromMagicBytes) {
      return typeFromMagicBytes
    }

    // Unsupported file type
    throw new ServiceError(
      'Unsupported file type. Please upload XLSX, CSV, PDF, or image files.',
      'INVALID_FILE_TYPE',
      400
    )
  }

  /**
   * Detect file type from filename extension
   */
  private detectFromExtension(filename: string): FileType | null {
    const ext = filename.toLowerCase().split('.').pop()

    if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
    if (ext === 'csv') return 'csv'
    if (ext === 'pdf') return 'pdf'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image'

    return null
  }

  /**
   * Detect file type from buffer magic bytes
   *
   * Magic bytes:
   * - PDF: 0x25 0x50 (%P)
   * - PNG: 0x89 0x50
   * - JPEG: 0xFF 0xD8
   * - GIF: 0x47 0x49 (GI)
   */
  private detectFromMagicBytes(buffer: Buffer): FileType | null {
    if (buffer.length < 2) {
      return null
    }

    // PDF magic bytes: %PDF
    if (buffer[0] === 0x25 && buffer[1] === 0x50) return 'pdf'

    // PNG magic bytes
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image'

    // JPEG magic bytes
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image'

    // GIF magic bytes: GIF
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image'

    return null
  }
}
