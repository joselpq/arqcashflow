#!/usr/bin/env node

/**
 * Automated Database Schema Documentation Generator
 *
 * Parses the Prisma schema file and generates comprehensive database documentation
 * following the established LLM-agent-optimized format.
 *
 * Usage: node scripts/generate-schema-docs.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SCHEMA_FILE = path.join(__dirname, '../../../prisma/schema.prisma');
const OUTPUT_DIR = path.join(__dirname, '../docs/developer/architecture');
const today = new Date().toISOString().split('T')[0];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse Prisma schema file
 */
function parseSchema(content) {
  const models = [];
  const enums = [];
  const generators = [];
  const datasources = [];

  // Split content into blocks
  const blocks = content.split(/(?=^(model|enum|generator|datasource)\s)/gm);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('model ')) {
      models.push(parseModel(trimmed));
    } else if (trimmed.startsWith('enum ')) {
      enums.push(parseEnum(trimmed));
    } else if (trimmed.startsWith('generator ')) {
      generators.push(parseGenerator(trimmed));
    } else if (trimmed.startsWith('datasource ')) {
      datasources.push(parseDatasource(trimmed));
    }
  }

  return { models, enums, generators, datasources };
}

/**
 * Parse a Prisma model
 */
function parseModel(block) {
  const lines = block.split('\n');
  const modelLine = lines[0];
  const name = modelLine.match(/model\s+(\w+)/)[1];

  const fields = [];
  const attributes = [];
  const relations = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '}') continue;

    if (line.startsWith('@@')) {
      // Model-level attributes
      attributes.push(line);
    } else if (line.includes('@relation') || line.includes('[]')) {
      // Relations
      const field = parseField(line);
      if (field) {
        relations.push(field);
        fields.push(field);
      }
    } else {
      // Regular fields
      const field = parseField(line);
      if (field) fields.push(field);
    }
  }

  return {
    name,
    fields,
    relations,
    attributes,
    documentation: extractDocumentation(block)
  };
}

/**
 * Parse a Prisma field
 */
function parseField(line) {
  const fieldMatch = line.match(/(\w+)\s+(\w+(?:\[\])?(?:\?)?)\s*(.*)/);
  if (!fieldMatch) return null;

  const [, name, type, rest] = fieldMatch;
  const attributes = [];
  const isOptional = type.includes('?');
  const isArray = type.includes('[]');
  const baseType = type.replace(/[\[\]?]/g, '');

  // Parse attributes
  const attrMatches = rest.match(/@\w+(?:\([^)]*\))?/g) || [];
  for (const attr of attrMatches) {
    attributes.push(attr);
  }

  const isId = attributes.some(attr => attr.includes('@id'));
  const isUnique = attributes.some(attr => attr.includes('@unique'));
  const hasDefault = attributes.some(attr => attr.includes('@default'));
  const isRelation = attributes.some(attr => attr.includes('@relation'));

  return {
    name,
    type: baseType,
    isOptional,
    isArray,
    isId,
    isUnique,
    hasDefault,
    isRelation,
    attributes,
    documentation: extractFieldDocumentation(line)
  };
}

/**
 * Parse a Prisma enum
 */
function parseEnum(block) {
  const lines = block.split('\n');
  const enumLine = lines[0];
  const name = enumLine.match(/enum\s+(\w+)/)[1];

  const values = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '}') continue;
    values.push(line);
  }

  return { name, values };
}

/**
 * Parse generator block
 */
function parseGenerator(block) {
  const lines = block.split('\n');
  const name = lines[0].match(/generator\s+(\w+)/)[1];
  const config = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '}') continue;
    const match = line.match(/(\w+)\s*=\s*"([^"]+)"/);
    if (match) {
      config[match[1]] = match[2];
    }
  }

  return { name, config };
}

/**
 * Parse datasource block
 */
function parseDatasource(block) {
  const lines = block.split('\n');
  const name = lines[0].match(/datasource\s+(\w+)/)[1];
  const config = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '}') continue;
    const match = line.match(/(\w+)\s*=\s*"([^"]+)"|(\w+)\s*=\s*env\("([^"]+)"\)/);
    if (match) {
      if (match[1]) {
        config[match[1]] = match[2];
      } else if (match[3]) {
        config[match[3]] = `env("${match[4]}")`;
      }
    }
  }

  return { name, config };
}

/**
 * Extract documentation comments
 */
function extractDocumentation(block) {
  const docLines = [];
  const lines = block.split('\n');

  for (const line of lines) {
    if (line.trim().startsWith('///')) {
      docLines.push(line.trim().replace(/^\/\/\/\s*/, ''));
    }
  }

  return docLines.join('\n');
}

/**
 * Extract field documentation
 */
function extractFieldDocumentation(line) {
  const commentMatch = line.match(/\/\/\s*(.+)$/);
  return commentMatch ? commentMatch[1] : '';
}

/**
 * Generate database schema documentation
 */
function generateSchemaDoc(schema) {
  const { models, enums, generators, datasources } = schema;

  return `---
title: "Database Schema"
type: "reference"
audience: ["developer", "agent"]
contexts: ["database", "prisma", "schema", "orm"]
complexity: "intermediate"
last_updated: "${today}"
version: "1.0"
agent_roles: ["database-developer", "backend-engineer", "data-modeler"]
related:
  - developer/architecture/overview.md
  - developer/setup.md
dependencies: ["prisma", "postgresql"]
---

# Database Schema

Comprehensive database schema documentation for ArqCashflow generated from Prisma schema.

## Context for LLM Agents

**Scope**: Complete database schema including models, relationships, constraints, and business logic
**Prerequisites**: Understanding of relational databases, Prisma ORM, and multi-tenant architecture
**Key Patterns**:
- Team-based data isolation with \`teamId\` fields
- Cascade delete strategies for data integrity
- Timestamp tracking with \`createdAt\` and \`updatedAt\`
- Optional relationships for flexible business logic
- Indexed fields for performance optimization

## Configuration

### Datasources
${datasources.map(ds => `
#### ${ds.name}
\`\`\`prisma
datasource ${ds.name} {
  provider = "${ds.config.provider}"
  url      = ${ds.config.url}
}
\`\`\`
`).join('\n')}

### Generators
${generators.map(gen => `
#### ${gen.name}
\`\`\`prisma
generator ${gen.name} {
${Object.entries(gen.config).map(([key, value]) => `  ${key} = "${value}"`).join('\n')}
}
\`\`\`
`).join('\n')}

## Data Models

### Model Overview

| Model | Purpose | Key Relationships |
|-------|---------|-------------------|
${models.map(model => {
  const relationships = model.relations.map(rel => rel.name).join(', ') || 'None';
  return `| ${model.name} | ${getModelPurpose(model.name)} | ${relationships} |`;
}).join('\n')}

${models.map(model => generateModelDoc(model)).join('\n\n')}

## Enumerations

${enums.map(enumDef => `
### ${enumDef.name}

\`\`\`prisma
enum ${enumDef.name} {
${enumDef.values.map(value => `  ${value}`).join('\n')}
}
\`\`\`
`).join('\n')}

## Relationships Overview

### Entity Relationship Diagram

\`\`\`
${generateERDiagram(models)}
\`\`\`

### Relationship Types

#### One-to-Many Relationships
${getOneToManyRelationships(models).map(rel => `
- **${rel.parent}** → **${rel.child}**: ${rel.description}
  - Delete strategy: ${rel.deleteStrategy}
  - Business rule: ${rel.businessRule}
`).join('\n')}

#### Many-to-One Relationships
${getManyToOneRelationships(models).map(rel => `
- **${rel.child}** → **${rel.parent}**: ${rel.description}
  - Optional: ${rel.optional ? 'Yes' : 'No'}
  - Business rule: ${rel.businessRule}
`).join('\n')}

## Indexes and Performance

### Primary Indexes
${models.map(model => {
  const idField = model.fields.find(f => f.isId);
  return idField ? `- **${model.name}**: \`${idField.name}\` (${idField.type})` : '';
}).filter(Boolean).join('\n')}

### Secondary Indexes
${getSecondaryIndexes(models).map(index => `
- **${index.model}.${index.field}**: ${index.purpose}
`).join('\n')}

### Performance Considerations
- **Team Isolation**: All queries include \`teamId\` filter for multi-tenant performance
- **Timestamp Indexes**: \`createdAt\` and \`updatedAt\` fields are indexed for chronological queries
- **Foreign Key Indexes**: All relationship fields have automatic indexes
- **Composite Indexes**: Consider adding for frequently combined filter conditions

## Business Logic Constraints

### Data Integrity Rules
1. **Team Isolation**: All user data must include \`teamId\` for multi-tenant security
2. **Cascade Deletes**: Parent entities cascade delete to children where appropriate
3. **Soft Deletes**: Consider implementing for audit trail requirements
4. **Timestamp Tracking**: All entities track creation and modification times

### Validation Patterns
\`\`\`typescript
// Team isolation enforcement
const where = {
  teamId: session.user.teamId,
  ...additionalFilters
};

// Safe relationship updates
const updateWithRelations = await prisma.model.update({
  where: { id, teamId },
  data: updateData,
  include: { relatedModel: true }
});
\`\`\`

## Migration Strategy

### Schema Evolution
- **Additive Changes**: New optional fields can be added safely
- **Breaking Changes**: Require migration scripts and version coordination
- **Index Changes**: Can be applied with minimal downtime
- **Relationship Changes**: Require careful data migration planning

### Deployment Checklist
- [ ] Test migrations in development environment
- [ ] Backup production database before deployment
- [ ] Apply migrations with \`prisma migrate deploy\`
- [ ] Verify data integrity after migration
- [ ] Monitor performance after index changes

## Troubleshooting

### Common Issues

#### "Foreign key constraint violation"
- **Cause**: Attempting to delete parent record with existing children
- **Solution**: Delete children first or use cascade delete strategy

#### "Unique constraint violation"
- **Cause**: Attempting to create duplicate values in unique fields
- **Solution**: Check for existing records before creation

#### "Team isolation failures"
- **Cause**: Missing \`teamId\` filter in queries
- **Solution**: Always include team context in database operations

### Debugging Queries
\`\`\`typescript
// Enable query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Check generated SQL
const result = await prisma.model.findMany({
  where: { teamId: 'team123' }
});
\`\`\`

## Related Documentation

- [Architecture Overview](./overview.md) - System design patterns
- [API Reference](../../reference/api/index.md) - API endpoint documentation
- [Development Setup](../setup.md) - Database setup instructions

---

*This documentation is auto-generated from \`prisma/schema.prisma\`. For updates, modify the schema file and regenerate.*
*Last generated: ${today}*`;
}

/**
 * Generate documentation for a single model
 */
function generateModelDoc(model) {
  const { name, fields, relations, attributes } = model;

  return `### ${name}

${model.documentation ? `*${model.documentation}*\n` : ''}

\`\`\`prisma
model ${name} {
${fields.map(field => {
  const attrs = field.attributes.join(' ');
  const comment = field.documentation ? ` // ${field.documentation}` : '';
  return `  ${field.name.padEnd(12)} ${field.type}${field.isOptional ? '?' : ''}${field.isArray ? '[]' : ''} ${attrs}${comment}`;
}).join('\n')}
${attributes.map(attr => `  ${attr}`).join('\n')}
}
\`\`\`

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
${fields.filter(f => !f.isRelation).map(field => {
  const constraints = [];
  if (field.isId) constraints.push('Primary Key');
  if (field.isUnique) constraints.push('Unique');
  if (!field.isOptional) constraints.push('Required');
  if (field.hasDefault) constraints.push('Has Default');

  return `| \`${field.name}\` | ${field.type}${field.isOptional ? '?' : ''}${field.isArray ? '[]' : ''} | ${constraints.join(', ') || 'None'} | ${field.documentation || '-'} |`;
}).join('\n')}

${relations.length > 0 ? `#### Relationships

| Field | Type | Relationship | Description |
|-------|------|--------------|-------------|
${relations.map(rel => {
  const relType = rel.isArray ? 'One-to-Many' : 'Many-to-One';
  return `| \`${rel.name}\` | ${rel.type}${rel.isOptional ? '?' : ''}${rel.isArray ? '[]' : ''} | ${relType} | ${rel.documentation || 'Related ' + rel.type + ' records'} |`;
}).join('\n')}` : ''}

#### Business Rules
${getModelBusinessRules(name).map(rule => `- ${rule}`).join('\n')}`;
}

/**
 * Get model purpose description
 */
function getModelPurpose(modelName) {
  const purposes = {
    'User': 'User authentication and profile management',
    'Team': 'Multi-tenant team organization',
    'Contract': 'Client agreements and project definitions',
    'Receivable': 'Expected payments and cash flow tracking',
    'Expense': 'Project costs and operational spending',
    'Budget': 'Financial planning and budget management',
    'RecurringExpense': 'Automated recurring cost management',
    'AuditLog': 'System activity tracking and compliance'
  };
  return purposes[modelName] || 'Data management entity';
}

/**
 * Get business rules for a model
 */
function getModelBusinessRules(modelName) {
  const rules = {
    'Contract': [
      'Must belong to a team (teamId required)',
      'Total value must be positive',
      'Signed date cannot be in the future',
      'Deleting a contract cascades to all receivables'
    ],
    'Receivable': [
      'Must be linked to a contract',
      'Expected date drives overdue calculations',
      'Amount must be positive',
      'Status is calculated based on dates and payments'
    ],
    'Expense': [
      'Can be linked to contract (project expense) or standalone (operational)',
      'Due date drives overdue calculations',
      'Amount must be positive',
      'Recurring expenses generate automatic instances'
    ],
    'User': [
      'Email must be unique across the system',
      'Automatically assigned to a team during registration',
      'Password is hashed using NextAuth.js'
    ],
    'Team': [
      'Provides data isolation boundary',
      'All user data must reference teamId',
      'Cannot be deleted if it has associated data'
    ]
  };
  return rules[modelName] || ['Standard CRUD operations apply'];
}

/**
 * Generate simple ER diagram
 */
function generateERDiagram(models) {
  const lines = [];

  for (const model of models) {
    const relations = model.relations;
    for (const rel of relations) {
      if (rel.isArray) {
        lines.push(`${model.name} ||--o{ ${rel.type} : has many`);
      } else {
        lines.push(`${rel.type} ||--|| ${model.name} : belongs to`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Get one-to-many relationships
 */
function getOneToManyRelationships(models) {
  const relationships = [];

  for (const model of models) {
    const oneToMany = model.relations.filter(rel => rel.isArray);
    for (const rel of oneToMany) {
      relationships.push({
        parent: model.name,
        child: rel.type,
        description: `One ${model.name} can have multiple ${rel.type} records`,
        deleteStrategy: 'Cascade',
        businessRule: `Deleting ${model.name} removes all related ${rel.type} records`
      });
    }
  }

  return relationships;
}

/**
 * Get many-to-one relationships
 */
function getManyToOneRelationships(models) {
  const relationships = [];

  for (const model of models) {
    const manyToOne = model.relations.filter(rel => !rel.isArray);
    for (const rel of manyToOne) {
      relationships.push({
        child: model.name,
        parent: rel.type,
        description: `Multiple ${model.name} records can belong to one ${rel.type}`,
        optional: rel.isOptional,
        businessRule: rel.isOptional ?
          `${model.name} can exist without ${rel.type}` :
          `${model.name} must be linked to ${rel.type}`
      });
    }
  }

  return relationships;
}

/**
 * Get secondary indexes
 */
function getSecondaryIndexes(models) {
  const indexes = [];

  for (const model of models) {
    // Common indexed fields
    const indexableFields = model.fields.filter(field =>
      field.name === 'teamId' ||
      field.name === 'createdAt' ||
      field.name === 'updatedAt' ||
      field.name.endsWith('Id') ||
      field.name === 'email' ||
      field.name === 'status'
    );

    for (const field of indexableFields) {
      let purpose = 'Performance optimization';
      if (field.name === 'teamId') purpose = 'Multi-tenant data isolation';
      if (field.name === 'email') purpose = 'User authentication lookup';
      if (field.name === 'status') purpose = 'Status-based filtering';
      if (field.name.endsWith('Id')) purpose = 'Foreign key relationship';

      indexes.push({
        model: model.name,
        field: field.name,
        purpose
      });
    }
  }

  return indexes;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Parsing Prisma schema...');

  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`❌ Schema file not found: ${SCHEMA_FILE}`);
    process.exit(1);
  }

  try {
    const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const schema = parseSchema(schemaContent);

    console.log(`📊 Found ${schema.models.length} models, ${schema.enums.length} enums`);

    const documentation = generateSchemaDoc(schema);
    const outputFile = path.join(OUTPUT_DIR, 'database.md');

    fs.writeFileSync(outputFile, documentation);
    console.log(`✅ Generated: ${outputFile}`);

    console.log('🎉 Database schema documentation generation complete!');

  } catch (error) {
    console.error('❌ Error generating schema documentation:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { parseSchema, generateSchemaDoc };