---
title: "ArqCashflow Design Principles"
type: "guide"
audience: ["designer", "developer", "agent"]
contexts: ["design", "ui-ux", "visual-design"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "2.0"
agent_roles: ["ui-designer", "frontend-developer", "ux-researcher"]
related:
  - design/components/forms.md
  - design/components/buttons.md
  - design/patterns/navigation.md
dependencies: ["tailwindcss", "react"]
---

# ArqCashflow Design Principles

*Minimalist, Intentional, Intuitive Design for Architects*

## Context for LLM Agents

**Scope**: Visual design system, UX patterns, and implementation guidelines
**Prerequisites**: Understanding of modern web design, Tailwind CSS, React components
**Key Patterns**:
- Minimalist design pattern
- Architect-focused aesthetics
- Accessibility-first approach

## Philosophy

ArqCashflow embodies the same design principles that architects apply to their work: **form follows function**, **less is more**, and **every element has purpose**. Inspired by Apple's design philosophy, we create experiences that are intuitive, beautiful, and functionally elegant.

### Core Values
- **Intentional**: Every element serves a clear purpose
- **Minimalist**: Remove everything unnecessary, highlight what matters
- **Intuitive**: Users should never wonder what to do next
- **Professional**: Reflects the sophistication of architectural practice
- **Accessible**: Clear contrast, readable typography, logical flow

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
- **Base (16px/24px)**: Standard content, form inputs
- **Small (14px/20px)**: Supporting text, metadata

### Typography Rules
1. **Maximum 3 font weights** per page
2. **Consistent line height** (1.4-1.6x font size)
3. **Proper contrast ratios** (4.5:1 minimum)
4. **Semantic hierarchy** (larger = more important)

## Color System

### Core Palette

#### Neutrals (Base Layer)
```css
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
```css
Green-600: #16A34A (Primary success)
Green-700: #15803D (Strong success, income values)
```

**Warning/Attention (Amber)**
```css
Amber-600: #D97706 (Primary warning)
Amber-700: #B45309 (Strong warning)
```

**Error/Expenses (Red)**
```css
Red-500:  #EF4444 (Expenses, secondary errors)
Red-600:  #DC2626 (Primary error, urgent actions)
```

**Primary/Actions (Blue)**
```css
Blue-600: #2563EB (Primary actions, links)
Blue-700: #1D4ED8 (Strong actions)
```

### Color Usage Rules

#### Semantic Mapping
- **Green**: Income, revenue, positive cash flow, success states
- **Red**: Expenses, overdue items, errors, negative values
- **Amber**: Warnings, pending items, attention needed
- **Blue**: Actions, links, information, neutral progress
- **Neutral**: Content, backgrounds, borders, inactive states

## Spacing & Layout

### Spacing Philosophy
Consistent spacing creates **visual rhythm and hierarchy**. Use multiples of 4px for all spacing decisions.

### Spacing Scale
```css
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

#### Component Spacing
1. **Card Padding**: 24px all sides (lg)
2. **Form Field Spacing**: 16px between fields (md)
3. **Button Spacing**: 8px between grouped buttons (sm)
4. **Section Spacing**: 48px between major sections (2xl)

## Component Design Principles

### Buttons

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

#### Card Structure
1. **Header**: Title and primary action
2. **Body**: Main content with proper spacing
3. **Footer**: Secondary actions and metadata

## User Experience Patterns

### Navigation Philosophy
Navigation should be **persistent, predictable, and purposeful**. Users should always know where they are and how to get where they need to go.

#### Primary Navigation
- **Always Visible**: Persistent top navigation
- **Current Page Indicator**: Clear visual state
- **Logical Order**: Follow user workflow sequence
- **Responsive**: Collapse to menu on mobile

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

#### Interactive Elements
- Minimum 44px touch targets
- Clear focus indicators
- Descriptive link text
- Proper form labels and error messages

## Implementation with Tailwind CSS

### Component Classes Example
```jsx
// Primary Button
<button className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
  Primary Action
</button>

// Card Component
<div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
  <h2 className="text-xl font-semibold text-neutral-900 mb-4">
    Card Title
  </h2>
  <p className="text-neutral-600">Card content goes here</p>
</div>

// Form Input
<input className="w-full h-12 px-4 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-500 focus:bg-white focus:border-blue-600 focus:outline-none" />
```

---

*This design system evolves with our product. For component-specific guidelines, see the components documentation.*