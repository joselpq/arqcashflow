/**
 * FileTypeDetector Unit Tests
 *
 * Tests file type detection from extensions and magic bytes
 * Part of ADR-026: SetupAssistant Service Decomposition
 */

import { FileTypeDetector } from '@/lib/services/setup-assistant/core/FileTypeDetector'
import { ServiceError } from '@/lib/services/BaseService'

describe('FileTypeDetector', () => {
  let detector: FileTypeDetector

  beforeEach(() => {
    detector = new FileTypeDetector()
  })

  describe('Extension-based detection', () => {
    it('detects XLSX files from extension', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.xlsx', buffer)).toBe('xlsx')
      expect(detector.detectFileType('test.XLSX', buffer)).toBe('xlsx')
    })

    it('detects XLS files from extension', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.xls', buffer)).toBe('xlsx')
      expect(detector.detectFileType('test.XLS', buffer)).toBe('xlsx')
    })

    it('detects CSV files from extension', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.csv', buffer)).toBe('csv')
      expect(detector.detectFileType('test.CSV', buffer)).toBe('csv')
    })

    it('detects PDF files from extension', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.pdf', buffer)).toBe('pdf')
      expect(detector.detectFileType('test.PDF', buffer)).toBe('pdf')
    })

    it('detects PNG images from extension', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.png', buffer)).toBe('image')
      expect(detector.detectFileType('test.PNG', buffer)).toBe('image')
    })

    it('detects JPEG images from extension', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.jpg', buffer)).toBe('image')
      expect(detector.detectFileType('test.jpeg', buffer)).toBe('image')
      expect(detector.detectFileType('test.JPG', buffer)).toBe('image')
    })

    it('detects GIF images from extension', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.gif', buffer)).toBe('image')
    })

    it('detects WebP images from extension', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.webp', buffer)).toBe('image')
    })
  })

  describe('Magic byte detection', () => {
    it('detects PDF from magic bytes (%PDF)', () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
      expect(detector.detectFileType('unknown.dat', buffer)).toBe('pdf')
    })

    it('detects PNG from magic bytes', () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]) // PNG signature
      expect(detector.detectFileType('unknown.dat', buffer)).toBe('image')
    })

    it('detects JPEG from magic bytes', () => {
      const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]) // JPEG signature
      expect(detector.detectFileType('unknown.dat', buffer)).toBe('image')
    })

    it('detects GIF from magic bytes', () => {
      const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38]) // GIF8
      expect(detector.detectFileType('unknown.dat', buffer)).toBe('image')
    })
  })

  describe('Error handling', () => {
    it('throws ServiceError for unsupported file types', () => {
      const buffer = Buffer.from([0x00, 0x00])

      expect(() => {
        detector.detectFileType('test.txt', buffer)
      }).toThrow(ServiceError)

      expect(() => {
        detector.detectFileType('test.doc', buffer)
      }).toThrow(ServiceError)

      expect(() => {
        detector.detectFileType('test.zip', buffer)
      }).toThrow(ServiceError)
    })

    it('throws ServiceError with correct error code', () => {
      const buffer = Buffer.from([0x00, 0x00])

      try {
        detector.detectFileType('test.txt', buffer)
        fail('Should have thrown ServiceError')
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError)
        expect((error as ServiceError).code).toBe('INVALID_FILE_TYPE')
        expect((error as ServiceError).statusCode).toBe(400)
      }
    })

    it('throws ServiceError with helpful message', () => {
      const buffer = Buffer.from([0x00, 0x00])

      try {
        detector.detectFileType('test.txt', buffer)
        fail('Should have thrown ServiceError')
      } catch (error) {
        expect((error as Error).message).toContain('Unsupported file type')
        expect((error as Error).message).toContain('XLSX, CSV, PDF, or image')
      }
    })
  })

  describe('Edge cases', () => {
    it('handles files with no extension', () => {
      const buffer = Buffer.from([0x00, 0x00])
      expect(() => {
        detector.detectFileType('README', buffer)
      }).toThrow(ServiceError)
    })

    it('handles files with multiple dots in name', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('my.file.test.xlsx', buffer)).toBe('xlsx')
    })

    it('handles empty buffer gracefully', () => {
      const buffer = Buffer.from([])
      expect(() => {
        detector.detectFileType('test.unknown', buffer)
      }).toThrow(ServiceError)
    })

    it('handles buffer with less than 2 bytes', () => {
      const buffer = Buffer.from([0x25])
      expect(() => {
        detector.detectFileType('test.unknown', buffer)
      }).toThrow(ServiceError)
    })

    it('prioritizes extension over magic bytes when both match', () => {
      // CSV file with PDF-like bytes (edge case)
      const buffer = Buffer.from([0x25, 0x50])
      // Extension should win
      expect(detector.detectFileType('data.csv', buffer)).toBe('csv')
    })
  })

  describe('Case insensitivity', () => {
    it('handles mixed case extensions', () => {
      const buffer = Buffer.from([])
      expect(detector.detectFileType('test.XlSx', buffer)).toBe('xlsx')
      expect(detector.detectFileType('test.PdF', buffer)).toBe('pdf')
      expect(detector.detectFileType('test.JpEg', buffer)).toBe('image')
    })
  })
})
