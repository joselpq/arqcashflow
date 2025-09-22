#!/usr/bin/env node

/**
 * Automated Changelog Generator
 *
 * Generates changelog from git commits and PR information following
 * conventional commit standards and LLM-agent-optimized format.
 *
 * Usage: node scripts/generate-changelog.js [--since=YYYY-MM-DD] [--output=path]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_FILE = path.join(__dirname, '../CHANGELOG.md');
const PROJECT_NAME = 'ArqCashflow';
const today = new Date().toISOString().split('T')[0];

// Parse command line arguments
const args = process.argv.slice(2);
const sinceDate = args.find(arg => arg.startsWith('--since='))?.split('=')[1];
const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || OUTPUT_FILE;

/**
 * Get git commits since a specific date
 */
function getCommits(since = null) {
  try {
    let gitCommand = 'git log --oneline --no-merges';
    if (since) {
      gitCommand += ` --since="${since}"`;
    } else {
      // Get commits from last 30 days by default
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      gitCommand += ` --since="${thirtyDaysAgo.toISOString().split('T')[0]}"`;
    }

    const output = execSync(gitCommand, { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    console.error('Error getting git commits:', error.message);
    return [];
  }
}

/**
 * Parse conventional commit
 */
function parseCommit(commitLine) {
  const [hash, ...messageParts] = commitLine.split(' ');
  const message = messageParts.join(' ');

  // Match conventional commit format: type(scope): description
  const conventionalMatch = message.match(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(?:\(([^)]+)\))?: (.+)$/);

  if (conventionalMatch) {
    return {
      hash: hash.substring(0, 7),
      type: conventionalMatch[1],
      scope: conventionalMatch[2] || null,
      description: conventionalMatch[3],
      message: message,
      isConventional: true
    };
  }

  // Try to categorize non-conventional commits
  return {
    hash: hash.substring(0, 7),
    type: categorizeCommit(message),
    scope: null,
    description: message,
    message: message,
    isConventional: false
  };
}

/**
 * Categorize non-conventional commits
 */
function categorizeCommit(message) {
  const msg = message.toLowerCase();

  if (msg.includes('fix') || msg.includes('bug') || msg.includes('error')) return 'fix';
  if (msg.includes('add') || msg.includes('new') || msg.includes('implement')) return 'feat';
  if (msg.includes('doc') || msg.includes('readme') || msg.includes('comment')) return 'docs';
  if (msg.includes('test') || msg.includes('spec')) return 'test';
  if (msg.includes('refactor') || msg.includes('cleanup') || msg.includes('improve')) return 'refactor';
  if (msg.includes('style') || msg.includes('format') || msg.includes('lint')) return 'style';
  if (msg.includes('ci') || msg.includes('workflow') || msg.includes('github')) return 'ci';
  if (msg.includes('build') || msg.includes('deps') || msg.includes('package')) return 'build';
  if (msg.includes('perf') || msg.includes('optimize') || msg.includes('speed')) return 'perf';

  return 'chore';
}

/**
 * Group commits by type
 */
function groupCommitsByType(commits) {
  const groups = {
    feat: [],
    fix: [],
    docs: [],
    perf: [],
    refactor: [],
    test: [],
    style: [],
    ci: [],
    build: [],
    chore: []
  };

  for (const commit of commits) {
    if (groups[commit.type]) {
      groups[commit.type].push(commit);
    } else {
      groups.chore.push(commit);
    }
  }

  return groups;
}

/**
 * Get commit details including author and date
 */
function getCommitDetails(hash) {
  try {
    const output = execSync(`git show --format="%an|%ad|%s" --no-patch ${hash}`, { encoding: 'utf8' });
    const [author, date, subject] = output.trim().split('|');
    return { author, date, subject };
  } catch (error) {
    return { author: 'Unknown', date: 'Unknown', subject: 'Unknown' };
  }
}

/**
 * Generate version number based on commit types
 */
function generateVersion(commits) {
  const hasBreaking = commits.some(commit =>
    commit.message.includes('BREAKING CHANGE') ||
    commit.message.includes('!:')
  );
  const hasFeatures = commits.some(commit => commit.type === 'feat');
  const hasFixes = commits.some(commit => commit.type === 'fix');

  // This is a simple version increment logic
  // In a real project, you'd want to read the current version from package.json
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  if (hasBreaking) {
    return `v${year}.${month}.0-beta`;
  } else if (hasFeatures) {
    return `v${year}.${month}.${day}-feat`;
  } else if (hasFixes) {
    return `v${year}.${month}.${day}-fix`;
  } else {
    return `v${year}.${month}.${day}`;
  }
}

/**
 * Generate changelog content
 */
function generateChangelog(commits) {
  const version = generateVersion(commits);
  const groups = groupCommitsByType(commits);

  let changelog = `---
title: "Changelog"
type: "reference"
audience: ["developer", "user", "agent"]
contexts: ["releases", "changes", "history"]
complexity: "beginner"
last_updated: "${today}"
version: "1.0"
agent_roles: ["release-manager", "change-tracker"]
related:
  - developer/architecture/overview.md
dependencies: []
---

# Changelog

All notable changes to ${PROJECT_NAME} will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Context for LLM Agents

**Scope**: Complete project change history with semantic versioning and conventional commits
**Prerequisites**: Understanding of semantic versioning and conventional commit standards
**Key Patterns**:
- Conventional commit categorization (feat, fix, docs, etc.)
- Breaking change identification
- Version number generation based on change types
- Automated generation from git history

## [${version}] - ${today}

`;

  // Add sections for each commit type
  const sectionTitles = {
    feat: '### ✨ Features',
    fix: '### 🐛 Bug Fixes',
    docs: '### 📚 Documentation',
    perf: '### ⚡ Performance',
    refactor: '### 🔨 Refactoring',
    test: '### 🧪 Testing',
    style: '### 💄 Styling',
    ci: '### 👷 CI/CD',
    build: '### 📦 Build System',
    chore: '### 🔧 Maintenance'
  };

  for (const [type, title] of Object.entries(sectionTitles)) {
    const typeCommits = groups[type];
    if (typeCommits.length > 0) {
      changelog += `${title}\n\n`;

      for (const commit of typeCommits) {
        const scope = commit.scope ? `**${commit.scope}**: ` : '';
        const description = commit.description.charAt(0).toUpperCase() + commit.description.slice(1);

        changelog += `- ${scope}${description} ([${commit.hash}](../../commit/${commit.hash}))\n`;
      }

      changelog += '\n';
    }
  }

  // Add breaking changes section if any
  const breakingChanges = commits.filter(commit =>
    commit.message.includes('BREAKING CHANGE') || commit.message.includes('!:')
  );

  if (breakingChanges.length > 0) {
    changelog += `### ⚠️ BREAKING CHANGES\n\n`;
    for (const commit of breakingChanges) {
      changelog += `- ${commit.description} ([${commit.hash}](../../commit/${commit.hash}))\n`;
    }
    changelog += '\n';
  }

  // Add statistics
  changelog += `### 📊 Release Statistics

- **Total commits**: ${commits.length}
- **Contributors**: ${[...new Set(commits.map(c => getCommitDetails(c.hash).author))].length}
- **Features**: ${groups.feat.length}
- **Bug fixes**: ${groups.fix.length}
- **Documentation updates**: ${groups.docs.length}

`;

  // Add footer
  changelog += `---

## Previous Releases

*Previous release notes will be preserved when this tool is integrated into the project.*

## Contributing

When making commits, please follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

\`\`\`
type(scope): description

Examples:
feat(contracts): add AI-powered contract creation
fix(api): resolve team isolation bug
docs(readme): update installation instructions
\`\`\`

### Commit Types

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Test additions or changes
- **chore**: Maintenance tasks
- **perf**: Performance improvements
- **ci**: CI/CD changes
- **build**: Build system changes

---

*This changelog is auto-generated from git commit history. Last updated: ${today}*`;

  return changelog;
}

/**
 * Main execution
 */
function main() {
  console.log('📝 Generating changelog...');

  const commits = getCommits(sinceDate);

  if (commits.length === 0) {
    console.log('ℹ️  No commits found for the specified period.');
    return;
  }

  console.log(`📊 Found ${commits.length} commits`);

  // Parse all commits
  const parsedCommits = commits.map(parseCommit);

  // Generate changelog
  const changelog = generateChangelog(parsedCommits);

  // Write to file
  fs.writeFileSync(outputPath, changelog);

  console.log(`✅ Changelog generated: ${outputPath}`);

  // Show summary
  const groups = groupCommitsByType(parsedCommits);
  const version = generateVersion(parsedCommits);

  console.log(`\\n📋 Release Summary (${version}):`);
  console.log(`   Features: ${groups.feat.length}`);
  console.log(`   Bug fixes: ${groups.fix.length}`);
  console.log(`   Documentation: ${groups.docs.length}`);
  console.log(`   Other changes: ${groups.chore.length + groups.refactor.length + groups.style.length}`);

  console.log('\\n🎉 Changelog generation complete!');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { parseCommit, generateChangelog, getCommits };