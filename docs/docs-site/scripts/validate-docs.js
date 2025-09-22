#!/usr/bin/env node

/**
 * Documentation Validation and Freshness Checker
 *
 * Validates documentation links, checks content freshness, and ensures
 * consistency across the documentation system.
 *
 * Usage: node scripts/validate-docs.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const MAX_AGE_DAYS = 90; // Consider content stale after 90 days
const today = new Date();

let validationResults = {
  totalFiles: 0,
  brokenLinks: [],
  staleContent: [],
  missingMetadata: [],
  inconsistentFormat: [],
  orphanedFiles: [],
  summary: {}
};

/**
 * Scan all markdown files in docs directory
 */
function scanDocumentationFiles(dir) {
  const files = [];

  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDir(itemPath);
      } else if (item.endsWith('.md')) {
        files.push(itemPath);
      }
    }
  }

  scanDir(dir);
  return files;
}

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const frontmatter = {};
  const lines = frontmatterMatch[1].split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value.startsWith('[') && value.endsWith(']')) {
        // Parse array
        frontmatter[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
      } else if (value.startsWith('"') && value.endsWith('"')) {
        // Parse string
        frontmatter[key] = value.slice(1, -1);
      } else {
        frontmatter[key] = value.replace(/"/g, '');
      }
    }
  }

  return frontmatter;
}

/**
 * Extract all links from markdown content
 */
function extractLinks(content) {
  const links = [];

  // Markdown links [text](url)
  const markdownLinks = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
  if (markdownLinks) {
    for (const link of markdownLinks) {
      const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        links.push({
          text: match[1],
          url: match[2],
          type: 'markdown'
        });
      }
    }
  }

  // Reference links [text]: url
  const referenceLinks = content.match(/^\[([^\]]+)\]:\s*(.+)$/gm);
  if (referenceLinks) {
    for (const link of referenceLinks) {
      const match = link.match(/^\[([^\]]+)\]:\s*(.+)$/);
      if (match) {
        links.push({
          text: match[1],
          url: match[2],
          type: 'reference'
        });
      }
    }
  }

  return links;
}

/**
 * Validate a single documentation file
 */
function validateFile(filePath) {
  console.log(`📝 Validating: ${path.relative(DOCS_DIR, filePath)}`);

  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatter = parseFrontmatter(content);
  const links = extractLinks(content);

  // Check for required frontmatter
  const requiredFields = ['title', 'type', 'audience', 'contexts'];
  const missingFields = requiredFields.filter(field => !frontmatter || !frontmatter[field]);

  if (missingFields.length > 0) {
    validationResults.missingMetadata.push({
      file: filePath,
      missing: missingFields
    });
  }

  // Check content freshness
  if (frontmatter && frontmatter.last_updated) {
    const lastUpdated = new Date(frontmatter.last_updated);
    const daysSinceUpdate = Math.floor((today - lastUpdated) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate > MAX_AGE_DAYS) {
      validationResults.staleContent.push({
        file: filePath,
        lastUpdated: frontmatter.last_updated,
        daysSinceUpdate
      });
    }
  }

  // Validate internal links
  for (const link of links) {
    if (link.url.startsWith('http') || link.url.startsWith('mailto:')) {
      // External link - skip for now (could be enhanced to check if reachable)
      continue;
    }

    // Internal link validation
    if (link.url.startsWith('./') || link.url.startsWith('../')) {
      const linkPath = path.resolve(path.dirname(filePath), link.url);

      if (!fs.existsSync(linkPath)) {
        validationResults.brokenLinks.push({
          file: filePath,
          link: link.url,
          text: link.text,
          resolvedPath: linkPath
        });
      }
    }
  }

  // Check format consistency
  const hasLLMContext = content.includes('## Context for LLM Agents');
  const hasProperStructure = frontmatter && frontmatter.agent_roles && frontmatter.contexts;

  if (!hasLLMContext || !hasProperStructure) {
    validationResults.inconsistentFormat.push({
      file: filePath,
      issues: [
        !hasLLMContext && 'Missing LLM Context section',
        !hasProperStructure && 'Missing agent_roles or contexts in frontmatter'
      ].filter(Boolean)
    });
  }

  validationResults.totalFiles++;
}

/**
 * Find orphaned files (not referenced by any other file)
 */
function findOrphanedFiles(files) {
  const referencedFiles = new Set();

  // Collect all referenced files
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const links = extractLinks(content);

    for (const link of links) {
      if (link.url.startsWith('./') || link.url.startsWith('../')) {
        const linkPath = path.resolve(path.dirname(filePath), link.url);
        if (fs.existsSync(linkPath)) {
          referencedFiles.add(linkPath);
        }
      }
    }
  }

  // Find files not referenced by others (excluding index files)
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const isIndex = fileName === 'index.md' || fileName === 'README.md';

    if (!isIndex && !referencedFiles.has(filePath)) {
      validationResults.orphanedFiles.push(filePath);
    }
  }
}

/**
 * Generate validation report
 */
function generateReport() {
  const report = `# Documentation Validation Report

Generated on: ${today.toISOString().split('T')[0]}

## Summary

- **Total files validated**: ${validationResults.totalFiles}
- **Broken links**: ${validationResults.brokenLinks.length}
- **Stale content**: ${validationResults.staleContent.length}
- **Missing metadata**: ${validationResults.missingMetadata.length}
- **Format inconsistencies**: ${validationResults.inconsistentFormat.length}
- **Orphaned files**: ${validationResults.orphanedFiles.length}

## Issues Found

### 🔗 Broken Links (${validationResults.brokenLinks.length})

${validationResults.brokenLinks.length === 0 ? '✅ No broken links found!' : validationResults.brokenLinks.map(issue => `
- **File**: \`${path.relative(DOCS_DIR, issue.file)}\`
  - **Link**: \`${issue.link}\`
  - **Text**: "${issue.text}"
  - **Resolved to**: \`${issue.resolvedPath}\`
`).join('\n')}

### 📅 Stale Content (${validationResults.staleContent.length})

${validationResults.staleContent.length === 0 ? '✅ All content is fresh!' : validationResults.staleContent.map(issue => `
- **File**: \`${path.relative(DOCS_DIR, issue.file)}\`
  - **Last updated**: ${issue.lastUpdated}
  - **Days since update**: ${issue.daysSinceUpdate}
`).join('\n')}

### 📋 Missing Metadata (${validationResults.missingMetadata.length})

${validationResults.missingMetadata.length === 0 ? '✅ All files have required metadata!' : validationResults.missingMetadata.map(issue => `
- **File**: \`${path.relative(DOCS_DIR, issue.file)}\`
  - **Missing fields**: ${issue.missing.join(', ')}
`).join('\n')}

### 📐 Format Inconsistencies (${validationResults.inconsistentFormat.length})

${validationResults.inconsistentFormat.length === 0 ? '✅ All files follow consistent format!' : validationResults.inconsistentFormat.map(issue => `
- **File**: \`${path.relative(DOCS_DIR, issue.file)}\`
  - **Issues**: ${issue.issues.join(', ')}
`).join('\n')}

### 🔍 Orphaned Files (${validationResults.orphanedFiles.length})

${validationResults.orphanedFiles.length === 0 ? '✅ No orphaned files found!' : validationResults.orphanedFiles.map(filePath => `
- \`${path.relative(DOCS_DIR, filePath)}\`
`).join('\n')}

## Recommendations

### High Priority
${validationResults.brokenLinks.length > 0 ? '- 🔴 Fix broken links to prevent navigation issues' : ''}
${validationResults.missingMetadata.length > 0 ? '- 🔴 Add missing metadata for proper categorization' : ''}
${validationResults.inconsistentFormat.length > 0 ? '- 🟡 Update format to match LLM-optimized structure' : ''}

### Medium Priority
${validationResults.staleContent.length > 0 ? '- 🟡 Review and update stale content' : ''}
${validationResults.orphanedFiles.length > 0 ? '- 🟡 Link orphaned files or consider removal' : ''}

### Maintenance Schedule
- **Weekly**: Check for new broken links
- **Monthly**: Review stale content warnings
- **Quarterly**: Full validation and cleanup

## Health Score

**Overall Score**: ${calculateHealthScore()}% ${getHealthEmoji()}

---

*This report was auto-generated by the documentation validation system.*`;

  return report;
}

/**
 * Calculate documentation health score
 */
function calculateHealthScore() {
  const totalIssues = validationResults.brokenLinks.length +
                     validationResults.missingMetadata.length +
                     validationResults.inconsistentFormat.length;

  const maxPossibleIssues = validationResults.totalFiles * 3; // 3 types of critical issues
  const score = Math.max(0, Math.floor(((maxPossibleIssues - totalIssues) / maxPossibleIssues) * 100));

  return score;
}

/**
 * Get health emoji based on score
 */
function getHealthEmoji() {
  const score = calculateHealthScore();

  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  return '🔴';
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting documentation validation...');

  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`❌ Documentation directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  const files = scanDocumentationFiles(DOCS_DIR);
  console.log(`📚 Found ${files.length} documentation files`);

  // Validate each file
  for (const filePath of files) {
    validateFile(filePath);
  }

  // Find orphaned files
  findOrphanedFiles(files);

  // Generate and save report
  const report = generateReport();
  const reportPath = path.join(__dirname, '../validation-report.md');
  fs.writeFileSync(reportPath, report);

  console.log('\\n📊 Validation Results:');
  console.log(`   Total files: ${validationResults.totalFiles}`);
  console.log(`   Broken links: ${validationResults.brokenLinks.length}`);
  console.log(`   Stale content: ${validationResults.staleContent.length}`);
  console.log(`   Missing metadata: ${validationResults.missingMetadata.length}`);
  console.log(`   Format issues: ${validationResults.inconsistentFormat.length}`);
  console.log(`   Orphaned files: ${validationResults.orphanedFiles.length}`);
  console.log(`   Health score: ${calculateHealthScore()}% ${getHealthEmoji()}`);

  console.log(`\\n✅ Validation report generated: ${reportPath}`);

  // Exit with error code if critical issues found
  const criticalIssues = validationResults.brokenLinks.length + validationResults.missingMetadata.length;
  if (criticalIssues > 0) {
    console.log(`\\n⚠️  Found ${criticalIssues} critical issues. Check the report for details.`);
    process.exit(1);
  }

  console.log('\\n🎉 Documentation validation complete!');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { validateFile, generateReport, scanDocumentationFiles };