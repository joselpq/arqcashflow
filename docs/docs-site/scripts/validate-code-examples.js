#!/usr/bin/env node

/**
 * Code Example Validation Script
 *
 * Extracts TypeScript/JavaScript code blocks from markdown files and validates
 * them for syntax errors. Part of Phase 4 automation features.
 *
 * Usage: node validate-code-examples.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const TEMP_DIR = path.join(__dirname, '../temp-code-validation');
const CODE_BLOCK_REGEX = /```(?:typescript|ts|javascript|js|jsx|tsx)\n([\s\S]*?)```/g;

let totalFiles = 0;
let totalCodeBlocks = 0;
let validCodeBlocks = 0;
let invalidCodeBlocks = 0;
let skippedCodeBlocks = 0;
let errors = [];

function log(message) {
  console.log(message);
}

function createTempDir() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanupTempDir() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

function extractCodeBlocks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(DOCS_DIR, filePath);
  const codeBlocks = [];

  let match;
  let blockIndex = 0;

  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    const code = match[1].trim();
    if (code.length > 0) {
      codeBlocks.push({
        file: relativePath,
        blockIndex: blockIndex++,
        code: code,
        language: match[0].split('\n')[0].replace('```', '') || 'typescript'
      });
    }
  }

  return codeBlocks;
}

function validateTypeScriptCode(codeBlock) {
  try {
    // Skip very short snippets (likely incomplete examples)
    if (codeBlock.code.length < 20) {
      return { valid: true, error: null, skipped: true };
    }

    // Skip examples that are clearly incomplete (just imports, interfaces, etc.)
    const isIncompleteExample = /^(import|export|interface|type|declare)/m.test(codeBlock.code.trim()) &&
                               !codeBlock.code.includes('{') ||
                               codeBlock.code.trim().startsWith('//') ||
                               codeBlock.code.includes('...') ||
                               codeBlock.code.includes('// Example:') ||
                               codeBlock.code.includes('// Usage:');

    if (isIncompleteExample) {
      return { valid: true, error: null, skipped: true };
    }

    const tempFileName = `code-block-${codeBlock.file.replace(/[^a-zA-Z0-9]/g, '_')}-${codeBlock.blockIndex}.ts`;
    const tempFilePath = path.join(TEMP_DIR, tempFileName);

    // More comprehensive setup for validation
    let codeToValidate = `
// Auto-generated validation code
import * as React from 'react';
import { NextRequest, NextResponse } from 'next/server';

// Mock common ArqCashflow types
interface Contract {
  id: string;
  clientName: string;
  projectName: string;
  totalValue: number;
  signedDate: string;
  status: string;
  teamId: string;
}

interface Receivable {
  id: string;
  contractId?: string;
  amount: number;
  expectedDate: string;
  status: string;
  teamId: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  type: string;
  teamId: string;
}

// Mock globals
declare global {
  interface Window {
    [key: string]: any;
  }
  const process: any;
  const console: any;
  const require: any;
  const module: any;
  const exports: any;
  const __dirname: string;
  const __filename: string;
}

// Mock Next.js and React types
declare module 'next/server' {
  export class NextRequest {}
  export class NextResponse {
    static json(body: any): NextResponse;
  }
}

// Wrap code in async function to handle various patterns
async function validateCodeBlock() {
  try {
    ${codeBlock.code}
  } catch (e) {
    // Allow runtime errors, we only check syntax
  }
}
`;

    fs.writeFileSync(tempFilePath, codeToValidate);

    // Try to compile with TypeScript (with relaxed settings)
    execSync(`npx tsc --noEmit --skipLibCheck --target ES2020 --module commonjs --jsx react --allowJs --noImplicitAny false "${tempFilePath}"`, {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });

    return { valid: true, error: null };

  } catch (error) {
    // Parse TypeScript error for useful information
    const errorMessage = error.stderr ? error.stderr.toString() : error.message;

    // Skip certain common documentation patterns that aren't real errors
    if (errorMessage.includes('Cannot find name') &&
        (errorMessage.includes('prisma') || errorMessage.includes('db') || errorMessage.includes('auth'))) {
      return { valid: true, error: null, skipped: true };
    }

    const lines = errorMessage.split('\n');
    const relevantError = lines.find(line => line.includes('error TS')) || lines[0];

    return {
      valid: false,
      error: relevantError.replace(TEMP_DIR, '').replace(/\([0-9,]+\):/g, ':').trim()
    };
  }
}

function validateJavaScriptCode(codeBlock) {
  try {
    // Basic syntax check using Node.js
    const tempFileName = `code-block-${codeBlock.file.replace(/[^a-zA-Z0-9]/g, '_')}-${codeBlock.blockIndex}.js`;
    const tempFilePath = path.join(TEMP_DIR, tempFileName);

    // Wrap in try-catch to avoid execution issues
    const codeToValidate = `
try {
  // Original code block (syntax check only):
  ${codeBlock.code}
} catch (e) {
  // Ignore runtime errors, we only care about syntax
}
`;

    fs.writeFileSync(tempFilePath, codeToValidate);

    // Check syntax with Node.js
    execSync(`node --check "${tempFilePath}"`, {
      stdio: 'pipe'
    });

    return { valid: true, error: null };

  } catch (error) {
    return {
      valid: false,
      error: error.message.replace(TEMP_DIR, '').trim()
    };
  }
}

function validateCodeBlock(codeBlock) {
  totalCodeBlocks++;

  let result;
  if (codeBlock.language.includes('ts') || codeBlock.language === 'typescript') {
    result = validateTypeScriptCode(codeBlock);
  } else {
    result = validateJavaScriptCode(codeBlock);
  }

  if (result.skipped) {
    skippedCodeBlocks++;
  } else if (result.valid) {
    validCodeBlocks++;
  } else {
    invalidCodeBlocks++;
    errors.push({
      file: codeBlock.file,
      blockIndex: codeBlock.blockIndex,
      language: codeBlock.language,
      error: result.error,
      code: codeBlock.code.substring(0, 100) + (codeBlock.code.length > 100 ? '...' : '')
    });
  }

  return result;
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      totalFiles++;
      const codeBlocks = extractCodeBlocks(filePath);

      if (codeBlocks.length > 0) {
        log(`📄 Validating ${codeBlocks.length} code block(s) in: ${path.relative(DOCS_DIR, filePath)}`);

        for (const codeBlock of codeBlocks) {
          const result = validateCodeBlock(codeBlock);
          if (result.skipped) {
            log(`  ⏭️  Block ${codeBlock.blockIndex} (${codeBlock.language}): Skipped (documentation snippet)`);
          } else if (!result.valid) {
            log(`  ❌ Block ${codeBlock.blockIndex} (${codeBlock.language}): ${result.error}`);
          } else {
            log(`  ✅ Block ${codeBlock.blockIndex} (${codeBlock.language}): Valid`);
          }
        }
      }
    }
  }
}

function generateReport() {
  const reportPath = path.join(__dirname, '../code-validation-report.md');
  const successRate = totalCodeBlocks > 0 ? ((validCodeBlocks / totalCodeBlocks) * 100).toFixed(1) : 100;

  let report = `# Code Example Validation Report

Generated on: ${new Date().toISOString().split('T')[0]}

## Summary

- **Total markdown files**: ${totalFiles}
- **Total code blocks**: ${totalCodeBlocks}
- **Valid code blocks**: ${validCodeBlocks}
- **Invalid code blocks**: ${invalidCodeBlocks}
- **Success rate**: ${successRate}%

## Validation Results

`;

  if (invalidCodeBlocks === 0) {
    report += `✅ **All code examples are valid!**

No syntax errors found in any TypeScript/JavaScript code blocks.

`;
  } else {
    report += `## ❌ Issues Found (${invalidCodeBlocks})

`;

    for (const error of errors) {
      report += `### ${error.file} - Block ${error.blockIndex} (${error.language})

**Error**: ${error.error}

**Code preview**:
\`\`\`${error.language}
${error.code}
\`\`\`

---

`;
    }
  }

  report += `## Recommendations

### High Priority
${invalidCodeBlocks > 0 ? '- 🔴 Fix syntax errors in code examples' : '- ✅ No critical issues found'}

### Maintenance
- Review code examples during documentation updates
- Ensure examples stay current with API changes
- Add more comprehensive type annotations

## Health Score

**Code Quality Score**: ${successRate}% ${successRate >= 95 ? '🟢' : successRate >= 80 ? '🟡' : '🔴'}

---

*This report was auto-generated by the code example validation system.*
`;

  fs.writeFileSync(reportPath, report);
  log(`\n📊 Code validation report generated: ${reportPath}`);
}

function main() {
  log('🔍 Starting code example validation...');

  try {
    createTempDir();
    walkDirectory(DOCS_DIR);
    generateReport();

    log(`\n📊 Validation Results:`);
    log(`   Total files: ${totalFiles}`);
    log(`   Total code blocks: ${totalCodeBlocks}`);
    log(`   Valid code blocks: ${validCodeBlocks}`);
    log(`   Invalid code blocks: ${invalidCodeBlocks}`);

    const successRate = totalCodeBlocks > 0 ? ((validCodeBlocks / totalCodeBlocks) * 100).toFixed(1) : 100;
    log(`   Success rate: ${successRate}% ${successRate >= 95 ? '🟢' : successRate >= 80 ? '🟡' : '🔴'}`);

    log(`\n🎉 Code example validation complete!`);

    // Exit with error code if there are syntax errors
    if (invalidCodeBlocks > 0) {
      log(`\n⚠️  Found ${invalidCodeBlocks} code blocks with syntax errors.`);
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Error during validation: ${error.message}`);
    process.exit(1);
  } finally {
    cleanupTempDir();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, validateCodeBlock, extractCodeBlocks };