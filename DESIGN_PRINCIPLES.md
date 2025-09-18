# ArqCashflow Design Principles
*Minimalist, Intentional, Intuitive Design for Architects*

## Philosophy

ArqCashflow embodies the same design principles that architects apply to their work: **form follows function**, **less is more**, and **every element has purpose**. Inspired by Apple's design philosophy, we create experiences that are intuitive, beautiful, and functionally elegant.

### Core Values
- **Intentional**: Every element serves a clear purpose
- **Minimalist**: Remove everything unnecessary, highlight what matters
- **Intuitive**: Users should never wonder what to do next
- **Professional**: Reflects the sophistication of architectural practice
- **Accessible**: Clear contrast, readable typography, logical flow

---

## Visual Hierarchy & Hot Zones

### Page Heat Map Priority (Left-to-Right, Top-to-Bottom)

1. **Primary Action Zone** (Top-left quadrant)
   - Most important content and primary actions
   - Key metrics, critical alerts, main navigation

2. **Secondary Content** (Top-right quadrant)
   - Supporting information, secondary actions
   - Quick stats, notifications, user controls

3. **Content Body** (Bottom-left quadrant)
   - Main data tables, forms, detailed content
   - Primary workflow areas

4. **Supporting Elements** (Bottom-right quadrant)
   - Metadata, timestamps, less critical actions
   - Export options, settings links

### Page-Specific Heat Zones

#### Dashboard (Overview & Decision Making)
- **Hottest**: Financial health indicators, critical alerts
- **Purpose**: Enable quick financial health assessment
- **Priority**: Alert cards > Key metrics > Trends > Lists
- **User Journey**: Scan health → Address urgent items → Plan next actions

#### Projetos (Unified Project Management)
- **Hottest**: Active tab content, primary action buttons
- **Purpose**: Centralized management of contracts, receivables, and expenses
- **Priority**: Current tab content > Tab navigation > Add new items > Search/filter
- **User Journey**: Navigate to relevant tab → Review items → Take action → Switch context as needed
- **Sub-tabs**:
  - **Contratos**: Manage revenue pipeline and client relationships
  - **Recebíveis**: Track and optimize cash flow timing
  - **Despesas**: Control costs and manage vendor payments

---

## Typography System

### Font Philosophy
Typography should be **readable, hierarchical, and professional**. We use system fonts for performance and familiarity.

```css
Font Stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

### Type Scale & Usage

#### Headings
- **H1 (32px/40px)**: Page titles, section headers
  - Usage: "Dashboard", "Contracts", "Receivables"
  - Weight: 700 (Bold)
  - Color: Neutral-900

- **H2 (24px/32px)**: Card titles, subsection headers
  - Usage: "Recent Contracts", "Financial Overview"
  - Weight: 600 (Semibold)
  - Color: Neutral-800

- **H3 (20px/28px)**: Component headers, form sections
  - Usage: Form field groups, table headers
  - Weight: 600 (Semibold)
  - Color: Neutral-700

#### Body Text
- **Large (18px/28px)**: Key metrics, important numbers
  - Usage: Revenue figures, alert messages
  - Weight: 500-600 (Medium-Semibold)

- **Base (16px/24px)**: Standard content, form inputs
  - Usage: Table content, form labels, body text
  - Weight: 400-500 (Regular-Medium)

- **Small (14px/20px)**: Supporting text, metadata
  - Usage: Timestamps, descriptions, help text
  - Weight: 400 (Regular)

#### Interface Text
- **Caption (12px/16px)**: Minor details, validation
  - Usage: Form validation, table footnotes
  - Weight: 400 (Regular)
  - Color: Neutral-500

### Typography Rules
1. **Maximum 3 font weights** per page
2. **Consistent line height** (1.4-1.6x font size)
3. **Proper contrast ratios** (4.5:1 minimum)
4. **Semantic hierarchy** (larger = more important)

---

## Color System

### Color Philosophy
Colors should be **meaningful, consistent, and accessible**. Every color choice communicates status, importance, or emotion.

### Core Palette

#### Neutrals (Base Layer)
```
Neutral-50:  #FAFAFA (Backgrounds, subtle highlights)
Neutral-100: #F5F5F5 (Card backgrounds, input fields)
Neutral-200: #E5E5E5 (Borders, dividers)
Neutral-300: #D4D4D4 (Inactive states)
Neutral-400: #A3A3A3 (Placeholders)
Neutral-500: #737373 (Secondary text)
Neutral-600: #525252 (Body text)
Neutral-700: #404040 (Headings)
Neutral-800: #262626 (Strong emphasis)
Neutral-900: #171717 (Primary text)
```

#### Semantic Colors (Status Communication)

**Success/Income (Green)**
```
Green-50:  #F0FDF4 (Success backgrounds)
Green-100: #DCFCE7 (Light success states)
Green-600: #16A34A (Primary success)
Green-700: #15803D (Strong success, income values)
Green-800: #166534 (Hover states)
```

**Warning/Attention (Amber)**
```
Amber-50:  #FFFBEB (Warning backgrounds)
Amber-100: #FEF3C7 (Light warning states)
Amber-600: #D97706 (Primary warning)
Amber-700: #B45309 (Strong warning)
Amber-800: #92400E (Hover states)
```

**Error/Expenses (Red)**
```
Red-50:   #FEF2F2 (Error backgrounds)
Red-100:  #FEE2E2 (Light error states)
Red-500:  #EF4444 (Expenses, secondary errors)
Red-600:  #DC2626 (Primary error, urgent actions)
Red-700:  #B91C1C (Strong error)
```

**Primary/Actions (Blue)**
```
Blue-50:  #EFF6FF (Info backgrounds)
Blue-100: #DBEAFE (Light info states)
Blue-600: #2563EB (Primary actions, links)
Blue-700: #1D4ED8 (Strong actions)
Blue-800: #1E40AF (Hover states)
```

### Color Usage Rules

#### Semantic Mapping
- **Green**: Income, revenue, positive cash flow, success states
- **Red**: Expenses, overdue items, errors, negative values
- **Amber**: Warnings, pending items, attention needed
- **Blue**: Actions, links, information, neutral progress
- **Neutral**: Content, backgrounds, borders, inactive states

#### Application Guidelines
1. **Financial Values**:
   - Positive amounts: Green-700
   - Negative amounts: Red-600
   - Neutral amounts: Neutral-900

2. **Status Indicators**:
   - Success: Green-600
   - Warning: Amber-600
   - Error: Red-600
   - Info: Blue-600

3. **Interactive Elements**:
   - Primary buttons: Blue-600 → Blue-700 (hover)
   - Destructive actions: Red-600 → Red-700 (hover)
   - Success actions: Green-600 → Green-700 (hover)

4. **Backgrounds**:
   - Page background: White
   - Card background: White
   - Input background: Neutral-50
   - Disabled background: Neutral-100

---

## Spacing & Layout

### Spacing Philosophy
Consistent spacing creates **visual rhythm and hierarchy**. Use multiples of 4px for all spacing decisions.

### Spacing Scale
```
xs:  4px   (Tight elements, icon padding)
sm:  8px   (Form field spacing, small gaps)
md:  16px  (Standard component spacing)
lg:  24px  (Section spacing, card padding)
xl:  32px  (Major section gaps)
2xl: 48px  (Page section separation)
3xl: 64px  (Major layout spacing)
```

### Layout Principles

#### Container Widths
- **Dashboard**: Full width with responsive grid
- **Forms**: Maximum 600px width, centered
- **Tables**: Full width with horizontal scroll on mobile
- **Content**: Maximum 1200px with side padding

#### Grid System
- **Desktop**: 12-column grid with 24px gutters
- **Tablet**: 8-column grid with 16px gutters
- **Mobile**: 4-column grid with 16px gutters

#### Component Spacing
1. **Card Padding**: 24px all sides (lg)
2. **Form Field Spacing**: 16px between fields (md)
3. **Button Spacing**: 8px between grouped buttons (sm)
4. **Section Spacing**: 48px between major sections (2xl)

---

## Component Design Principles

### Buttons

#### Philosophy
Buttons should clearly communicate **action, importance, and state**. Use size and color to indicate hierarchy.

#### Button Hierarchy
1. **Primary**: Main actions (Blue-600, semibold text)
2. **Secondary**: Alternative actions (Neutral-200 background, Neutral-700 text)
3. **Destructive**: Delete/cancel actions (Red-600)
4. **Ghost**: Subtle actions (transparent background, colored text)

#### Button Sizing
- **Large**: 48px height (major actions)
- **Default**: 40px height (standard actions)
- **Small**: 32px height (table actions, compact spaces)

### Forms

#### Philosophy
Forms should feel **conversational and progressive**. Guide users through input with clear labels and helpful feedback.

#### Form Principles
1. **Single Column Layout**: Easier to scan and complete
2. **Logical Grouping**: Related fields grouped with spacing
3. **Clear Labels**: Above fields, not placeholder text
4. **Immediate Validation**: Show errors as user types
5. **Progress Indication**: For multi-step forms

#### Input Design
- **Height**: 48px for touch-friendly interaction
- **Border**: 1px Neutral-300, Blue-600 on focus
- **Background**: Neutral-50 default, White on focus
- **Typography**: 16px to prevent mobile zoom

### Cards

#### Philosophy
Cards should **contain related information** and provide clear entry points for actions.

#### Card Structure
1. **Header**: Title and primary action
2. **Body**: Main content with proper spacing
3. **Footer**: Secondary actions and metadata

#### Card Types
- **Metric Cards**: Key numbers with trend indicators
- **Content Cards**: Lists, forms, detailed information
- **Action Cards**: Primary call-to-action areas

### Tables

#### Philosophy
Tables should make **data comparison easy** while maintaining readability.

#### Table Design
1. **Clear Headers**: Sortable with visual indicators
2. **Alternating Rows**: Subtle background for easier scanning
3. **Responsive**: Stack on mobile, scroll horizontally
4. **Actions**: Clearly visible, grouped logically

---

## User Experience Patterns

### Navigation Philosophy
Navigation should be **persistent, predictable, and purposeful**. Users should always know where they are and how to get where they need to go.

#### Primary Navigation
- **Always Visible**: Persistent top navigation
- **Current Page Indicator**: Clear visual state
- **Logical Order**: Follow user workflow sequence
- **Responsive**: Collapse to menu on mobile

#### Breadcrumbs
- Use for deep navigation (3+ levels)
- Show full path with clickable segments
- Place below navigation, above page title

### Information Architecture

#### Dashboard (Home Base)
**Purpose**: Quick health check and urgent action identification
**Primary Goal**: Answer "How is my business doing?"
**Content Priority**:
1. Financial health indicators
2. Critical alerts requiring immediate action
3. Key metrics (this month's performance)
4. Upcoming items (next 30 days)
5. Quick action buttons

#### Projetos (Unified Management Hub)
**Purpose**: Centralized project and financial management
**Primary Goal**: Streamlined workflow across all project-related activities
**Navigation Structure**: Tab-based interface with URL parameter support
**Content Priority**:
1. Active tab content (main focus area)
2. Tab navigation (context switching)
3. Add new items (context-specific CTAs)
4. Search, filtering, and actions

**Sub-tab Details**:
- **Contratos Tab**: Revenue pipeline and client relationship management
  - Active contracts list, new contract creation, search/filtering
- **Recebíveis Tab**: Cash flow tracking and payment management
  - Pending receivables, payment recording, overdue alerts
- **Despesas Tab**: Cost control and vendor management
  - Unpaid expenses, budget alerts, expense entry

### Interaction Patterns

#### Progressive Disclosure
- Show essential information first
- Provide expandable sections for details
- Use modals for secondary actions
- Collapse less important information

#### Feedback & Confirmation
- **Immediate**: Form validation, button states
- **Success**: Clear confirmation of completed actions
- **Error**: Helpful error messages with solutions
- **Loading**: Progress indicators for longer operations

#### Shortcuts & Efficiency
- **Keyboard Shortcuts**: For power users
- **Bulk Actions**: For managing multiple items
- **Quick Add**: Inline forms for common actions
- **Smart Defaults**: Pre-filled forms based on context

---

## Content Strategy

### Writing Principles
Content should be **clear, concise, and helpful**. Write for architects who understand their business but may not be financial experts.

#### Voice & Tone
- **Professional**: Appropriate for business context
- **Friendly**: Approachable and human
- **Clear**: No jargon, simple language
- **Helpful**: Guide users to success

#### Content Guidelines
1. **Use Action Words**: "Create", "Track", "Analyze"
2. **Be Specific**: "Overdue by 15 days" vs "Late"
3. **Provide Context**: Explain why something matters
4. **Offer Solutions**: Don't just identify problems

#### Error Messages
- **Explain What Happened**: Clear problem description
- **Suggest Solutions**: How to fix the issue
- **Provide Next Steps**: What to do now
- **Use Plain Language**: No technical jargon

### Internationalization
All content should support Brazilian Portuguese with proper:
- **Date Formats**: DD/MM/YYYY
- **Currency**: R$ 1.234,56
- **Number Formats**: 1.234,56 (European style)
- **Text Direction**: Left-to-right
- **Cultural Context**: Brazilian business practices

---

## Accessibility Standards

### Minimum Requirements
- **WCAG 2.1 AA Compliance**: Industry standard accessibility
- **Keyboard Navigation**: Full functionality without mouse
- **Screen Reader Support**: Proper semantic markup
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text

### Implementation Guidelines

#### Color & Contrast
- Never rely on color alone to convey information
- Provide text labels for status indicators
- Ensure sufficient contrast for all text
- Test with color blindness simulators

#### Typography
- Minimum 16px font size for body text
- Maximum 45-75 characters per line
- Sufficient line spacing (1.4-1.6x font size)
- Clear font hierarchy with proper heading structure

#### Interactive Elements
- Minimum 44px touch targets
- Clear focus indicators
- Descriptive link text
- Proper form labels and error messages

---

## Implementation Guidelines

### CSS Methodology
Use utility-first CSS (Tailwind) with custom components for consistency.

#### Component Structure
```css
.component {
  /* Layout properties */
  /* Typography properties */
  /* Color properties */
  /* Interactive states */
}
```

#### Naming Conventions
- **Components**: PascalCase (MetricCard, AlertBanner)
- **Utilities**: kebab-case (text-primary, bg-surface)
- **States**: prefix with state (hover:, focus:, active:)

### Design Tokens
Maintain design consistency with systematic tokens:

```javascript
const tokens = {
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
  colors: { primary: '#2563EB', success: '#16A34A', error: '#DC2626' },
  typography: { base: '16px', lg: '18px', xl: '20px' },
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.1)' }
}
```

### Performance Considerations
- **Optimize Images**: Use WebP format, proper sizing
- **Minimize Reflows**: Use transform for animations
- **Lazy Loading**: For images and non-critical content
- **Code Splitting**: Load only necessary JavaScript

---

## Quality Assurance

### Design Review Checklist
Before implementing any new component or page:

#### Visual Design
- [ ] Follows established typography scale
- [ ] Uses semantic color system
- [ ] Maintains proper spacing rhythm
- [ ] Achieves sufficient contrast ratios
- [ ] Includes all interactive states

#### User Experience
- [ ] Clear information hierarchy
- [ ] Intuitive navigation flow
- [ ] Appropriate feedback for actions
- [ ] Responsive across devices
- [ ] Accessible to all users

#### Content
- [ ] Clear, concise copy
- [ ] Proper localization
- [ ] Helpful error messages
- [ ] Consistent terminology

### Testing Strategy
1. **Visual Regression**: Compare designs across updates
2. **Usability Testing**: Observe real user interactions
3. **Accessibility Audit**: Automated and manual testing
4. **Performance Monitoring**: Core Web Vitals tracking

---

*This document evolves with our product. Last updated: September 2025*
*For questions or suggestions, contact the design team.*