# ArqCashflow Documentation System

This directory contains the new LLM-agent-optimized documentation system for ArqCashflow, implemented using Docusaurus.

## 🚀 Quick Start

```bash
# Navigate to docs site
cd docs/docs-site

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 📁 Structure

```
docs/
├── docs-site/              # Docusaurus application
│   ├── docs/               # Documentation content
│   │   ├── user/           # User guides and tutorials
│   │   ├── developer/      # Technical documentation
│   │   ├── agents/         # LLM agent contexts (Phase 3)
│   │   ├── decisions/      # Architecture Decision Records
│   │   ├── reference/      # API and technical references
│   │   └── meta/           # Documentation about documentation
│   ├── src/                # Docusaurus React components
│   ├── static/             # Static assets
│   ├── docusaurus.config.ts # Site configuration
│   └── sidebars.ts         # Navigation structure
└── README.md               # This file
```

## 🎯 Phase 1 Implementation Status

### ✅ Completed
- [x] Docusaurus setup with TypeScript
- [x] Multi-sidebar navigation (User/Developer/Agent)
- [x] Document templates with structured metadata
- [x] GitHub Actions deployment pipeline
- [x] Initial content migration framework
- [x] Working build and deployment system

### 📋 Ready for Phase 2
- [ ] Content migration from existing docs
- [ ] Enhanced cross-referencing
- [ ] Agent-specific context sections
- [ ] Automated link validation

## 🤖 LLM-Agent Features

### Structured Metadata
Every document includes YAML frontmatter with:
- `audience`: Target readers (user/developer/agent/designer)
- `contexts`: Feature areas and domains
- `complexity`: Beginner/intermediate/advanced
- `agent_roles`: Specific LLM agent use cases
- `related`: Cross-references to related documents
- `dependencies`: Technical prerequisites

### Document Templates
- **[Document Template](./docs-site/docs/meta/templates/document-template.md)**: Standard structure for all docs
- **[ADR Template](./docs-site/docs/meta/templates/adr-template.md)**: Architecture Decision Records

### Agent Contexts
Specialized sections in each document:
- **Scope**: What the document covers
- **Prerequisites**: What agents need to know first
- **Key Patterns**: Reusable approaches

## 🚀 Deployment

### Automatic Deployment
- **Trigger**: Push to `main` branch with changes in `docs/` directory
- **Platform**: GitHub Pages (configurable for Vercel)
- **URL**: Will be available at GitHub Pages URL once deployed

### Manual Deployment
```bash
cd docs/docs-site
npm run build
npm run serve  # Test locally
```

## 📖 Usage Guidelines

### For Content Creators
1. Use document templates for consistency
2. Include structured metadata in frontmatter
3. Add "Context for LLM Agents" sections
4. Cross-reference related documents
5. Include working code examples

### For LLM Agents
1. Check document metadata for scope and prerequisites
2. Use "Context for LLM Agents" sections for orientation
3. Follow established patterns from the pattern library
4. Reference related documents for complete context
5. Maintain consistency with existing templates

## 🔄 Migration from Old Docs

The existing documentation files remain in the root directory as backup:
- `README.md` (original)
- `DEVELOPMENT.md` (original)
- `DESIGN_PRINCIPLES.md` (original)
- `GOOGLE_SHEETS_SIMPLE.md` (original)

These will be enhanced and migrated to the new structure in Phase 2.

## 🛠️ Development

### Adding New Documentation
1. Use appropriate template from `meta/templates/`
2. Place in correct directory based on audience
3. Update navigation in `sidebars.ts` if needed
4. Test build locally before committing

### Customizing the Site
- **Configuration**: Edit `docusaurus.config.ts`
- **Navigation**: Modify `sidebars.ts`
- **Styling**: Customize `src/css/custom.css`
- **Components**: Add React components in `src/components/`

## 📈 Future Phases

### Phase 2: Content Migration (Week 3-4)
- Migrate existing documentation with enhancements
- Add structured metadata to all documents
- Create comprehensive cross-reference system

### Phase 3: LLM Enhancement (Week 5-6)
- Add agent-specific contexts and patterns
- Create Architecture Decision Records (ADRs)
- Build pattern library for common development tasks

### Phase 4: Automation (Week 7-8)
- Auto-generate API documentation
- Implement automated link validation
- Set up content freshness monitoring

## 🤝 Contributing

This documentation system is designed for human-LLM collaborative development. All contributions should:

1. Follow the established templates
2. Include proper metadata
3. Add agent context sections
4. Cross-reference related content
5. Include working examples

For detailed guidelines, see the [Documentation Strategy Proposal](../DOCUMENTATION_STRATEGY_PROPOSAL.md).

---

*This documentation system represents Phase 1 of the LLM-Agent-Optimized Documentation Framework, providing the foundation for scalable, machine-readable documentation.*