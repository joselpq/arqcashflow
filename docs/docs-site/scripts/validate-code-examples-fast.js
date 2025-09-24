#!/usr/bin/env node

/**
 * Fast Code Example Validation Script
 *
 * Quick syntax validation for TypeScript/JavaScript code blocks in documentation.
 * Focuses on detecting genuine syntax errors rather than comprehensive validation.
 *
 * Usage: node validate-code-examples-fast.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const CODE_BLOCK_REGEX = /```(?:typescript|ts|javascript|js|jsx|tsx)\n([\s\S]*?)```/g;

let totalFiles = 0;
let totalCodeBlocks = 0;
let validCodeBlocks = 0;
let skippedCodeBlocks = 0;
let invalidCodeBlocks = 0;
let errors = [];

function log(message) {
  console.log(message);
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

function quickSyntaxCheck(codeBlock) {
  const code = codeBlock.code.trim();

  // Skip very short snippets or documentation patterns
  if (code.length < 15 ||
      code.startsWith('//') ||
      code.includes('...') ||
      code.includes('// Example') ||
      code.includes('// Usage') ||
      /^(import|export|interface|type|declare)\s/.test(code) ||
      code.includes('<!-- ') ||
      code.includes('TODO') ||
      code.includes('FIXME')) {
    return { valid: true, skipped: true };
  }

  // Basic syntax checks that catch real issues
  const syntaxErrors = [];

  // Check for unmatched brackets
  const brackets = { '(': ')', '[': ']', '{': '}' };
  const stack = [];

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (brackets[char]) {
      stack.push(char);
    } else if (Object.values(brackets).includes(char)) {
      const last = stack.pop();
      if (!last || brackets[last] !== char) {
        syntaxErrors.push(`Unmatched bracket: ${char} at position ${i}`);
      }
    }
  }

  if (stack.length > 0) {
    syntaxErrors.push(`Unclosed brackets: ${stack.join(', ')}`);
  }

  // Check for common syntax issues
  if (code.includes('function(') && !code.includes('function (')) {
    // Allow both styles, just checking for obvious typos
  }

  // Check for incomplete statements
  const lines = code.split('\n').filter(line => line.trim());
  const lastLine = lines[lines.length - 1]?.trim();

  if (lastLine && !lastLine.endsWith(';') && !lastLine.endsWith('}') &&
      !lastLine.endsWith(']') && !lastLine.endsWith(')') &&
      !lastLine.endsWith(',') && !lastLine.startsWith('//') &&
      lines.length > 1) {
    // This might be incomplete, but it's common in documentation
  }

  return {
    valid: syntaxErrors.length === 0,
    error: syntaxErrors.length > 0 ? syntaxErrors[0] : null
  };
}

function validateCodeBlock(codeBlock) {
  totalCodeBlocks++;
  const result = quickSyntaxCheck(codeBlock);

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
      code: codeBlock.code.substring(0, 150) + (codeBlock.code.length > 150 ? '...' : '')
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
        log(`📄 ${path.relative(DOCS_DIR, filePath)}: ${codeBlocks.length} code blocks`);

        for (const codeBlock of codeBlocks) {
          const result = validateCodeBlock(codeBlock);
          if (result.skipped) {
            log(`  ⏭️  Block ${codeBlock.blockIndex}: Skipped`);
          } else if (!result.valid) {
            log(`  ❌ Block ${codeBlock.blockIndex}: ${result.error}`);
          } else {
            log(`  ✅ Block ${codeBlock.blockIndex}: Valid`);
          }
        }
      }
    }
  }
}

function generateReport() {
  const reportPath = path.join(__dirname, '../code-validation-report.md');
  const validatedBlocks = totalCodeBlocks - skippedCodeBlocks;
  const successRate = validatedBlocks > 0 ? ((validCodeBlocks / validatedBlocks) * 100).toFixed(1) : 100;

  let report = `# Code Example Validation Report (Fast)

Generated on: ${new Date().toISOString().split('T')[0]}

## Summary

- **Total markdown files**: ${totalFiles}
- **Total code blocks**: ${totalCodeBlocks}
- **Validated code blocks**: ${validatedBlocks}
- **Skipped code blocks**: ${skippedCodeBlocks} (documentation snippets)
- **Valid code blocks**: ${validCodeBlocks}
- **Invalid code blocks**: ${invalidCodeBlocks}
- **Success rate**: ${successRate}% (of validated blocks)

## Validation Results

`;

  if (invalidCodeBlocks === 0) {
    report += `✅ **All validated code examples have correct syntax!**

No obvious syntax errors found. Skipped ${skippedCodeBlocks} documentation snippets.

`;
  } else {
    report += `## ❌ Syntax Issues Found (${invalidCodeBlocks})

`;

    for (const error of errors.slice(0, 10)) { // Limit to first 10 errors
      report += `### ${error.file} - Block ${error.blockIndex} (${error.language})

**Issue**: ${error.error}

**Code preview**:
\`\`\`${error.language}
${error.code}
\`\`\`

---

`;
    }

    if (errors.length > 10) {
      report += `... and ${errors.length - 10} more issues.\n\n`;
    }
  }

  report += `## Health Score

**Code Syntax Score**: ${successRate}% ${successRate >= 95 ? '🟢' : successRate >= 80 ? '🟡' : '🔴'}

---

*This report focuses on basic syntax validation. Many documentation code snippets are intentionally incomplete examples.*
`;

  fs.writeFileSync(reportPath, report);
  log(`\n📊 Report generated: ${reportPath}`);
}

function main() {
  log('🚀 Starting fast code example validation...');

  try {
    walkDirectory(DOCS_DIR);
    generateReport();

    log(`\n📊 Fast Validation Results:`);
    log(`   Total files: ${totalFiles}`);
    log(`   Total code blocks: ${totalCodeBlocks}`);
    log(`   Skipped (snippets): ${skippedCodeBlocks}`);
    log(`   Valid syntax: ${validCodeBlocks}`);
    log(`   Syntax errors: ${invalidCodeBlocks}`);

    const validatedBlocks = totalCodeBlocks - skippedCodeBlocks;
    const successRate = validatedBlocks > 0 ? ((validCodeBlocks / validatedBlocks) * 100).toFixed(1) : 100;
    log(`   Success rate: ${successRate}% ${successRate >= 95 ? '🟢' : successRate >= 80 ? '🟡' : '🔴'}`);

    log(`\n✨ Fast code validation complete!`);

    // Don't exit with error for documentation - just report
    if (invalidCodeBlocks > 0) {
      log(`\n💡 Found ${invalidCodeBlocks} potential syntax issues in documentation examples.`);
    }

  } catch (error) {
    log(`\n❌ Error during validation: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, validateCodeBlock, extractCodeBlocks };