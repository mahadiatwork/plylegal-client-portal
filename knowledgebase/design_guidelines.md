# Design Guidelines: Ply Legal — Client Portal

## Design Approach

**Selected Approach:** Design System (Form-Optimized)
- Primary inspiration: Tailwind UI form patterns + Stripe Dashboard's clarity
- Focus on form usability, progressive disclosure, and trust-building through professional aesthetics
- Legal industry standards: credibility through restraint, clarity over creativity

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary (Ply Green): 158 48% 31% — buttons, active states, progress indicators
- Background (Ply Blue): 228 100% 94% — page backgrounds, subtle washes
- Surface: 0 0% 100% — cards, form containers, modal backgrounds
- Text Primary: 158 25% 15% — headings, labels, body text
- Text Secondary: 158 10% 45% — helper text, secondary labels
- Border: 158 15% 88% — input borders, dividers, card edges
- Error: 0 72% 51% — validation errors, destructive actions
- Success: 142 71% 45% — success states, completion indicators

**Dark Mode:**
- Primary (Ply Green): 158 48% 45% — adjusted for dark backgrounds
- Background: 158 20% 12% — dark page background
- Surface: 158 15% 16% — cards, elevated surfaces
- Text Primary: 158 10% 92% — primary text
- Text Secondary: 158 8% 65% — secondary text
- Border: 158 12% 25% — borders and dividers

### B. Typography

**Font Families:**
- Headings: `font-serif` (Georgia, Merriweather via Google Fonts) — establishes legal credibility
- Body/Forms: `font-sans` (Inter or System UI stack) — optimal form readability
- Monospace: `font-mono` for reference numbers, codes

**Scale:**
- H1 (Page Titles): `text-3xl lg:text-4xl font-serif font-semibold` 
- H2 (Section Headers): `text-2xl lg:text-3xl font-serif font-medium`
- H3 (Subsections): `text-xl font-serif font-medium`
- Body: `text-base leading-relaxed`
- Labels: `text-sm font-medium tracking-wide`
- Helper Text: `text-sm text-secondary`

### C. Layout System

**Spacing Primitives:** Consistent use of Tailwind units 2, 4, 8, 12, 16, 20, 24
- Card padding: `p-6 lg:p-8`
- Section spacing: `space-y-8 lg:space-y-12`
- Form field groups: `space-y-6`
- Individual fields: `space-y-2`
- Page containers: `max-w-4xl mx-auto px-4 lg:px-8`

**Grid & Columns:**
- Single column forms: Default for mobile (prevents cognitive overload)
- Two-column groups: Desktop only for related pairs (name fields, date ranges) using `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Repeater tables: Full-width on desktop, card-stack on mobile

### D. Component Library

**Core Form Elements:**
- Inputs: `rounded-lg border-2 focus:ring-2 focus:ring-plygreen/20 focus:border-plygreen transition-colors h-11 px-4`
- Select dropdowns: Match input styling with chevron indicator
- Textareas: Minimum `rows={4}` for adequate writing space
- Buttons Primary: `bg-plygreen text-white hover:bg-plygreen/90 rounded-lg px-6 py-3 font-medium shadow-sm`
- Buttons Secondary: `bg-white text-plygreen border-2 border-plygreen hover:bg-plygreen/5`

**Navigation:**
- Desktop Sidebar: Fixed left rail with vertical stepper, current section highlighted with plygreen accent
- Mobile Tabs: Horizontal scrollable chips showing sections, sticky top position
- Bottom Bar: `fixed bottom-0 bg-white border-t shadow-lg p-4 flex justify-between items-center min-h-[72px]`
- Progress Bar: Thin `h-1` indicator at top using plygreen fill

**Data Display:**
- Cards: `bg-white rounded-2xl shadow-md border border-gray-100`
- Repeater Rows (Desktop): Clean table with hover states `hover:bg-plyblue/30`
- Repeater Cards (Mobile): Individual cards with `rounded-xl p-5 space-y-3 border-l-4 border-plygreen`
- Dialog/Modal: `max-w-2xl rounded-2xl shadow-2xl` with subtle backdrop blur

**Validation & Feedback:**
- Error Messages: `text-sm text-error mt-1` below invalid fields with error icon
- Success Toast: Slide in from top-right, plygreen accent, auto-dismiss 3s
- Required Indicators: Red asterisk `text-error` next to label
- Field Focus: 2px plygreen ring with subtle glow effect

**Character Questions (Specialized):**
- Yes/No toggle presented as radio group with generous `gap-4 lg:gap-6`
- Conditional repeaters slide in with subtle `animate-in fade-in-50 slide-in-from-top-2 duration-300`
- Question text: `text-base lg:text-lg leading-relaxed` for legal clarity

### E. Animations

**Minimal, Purposeful Motion:**
- Page transitions: Simple fade `duration-200`
- Repeater add/remove: Slide and fade `duration-300 ease-out`
- Modal open: Scale from 95% to 100% with fade
- No scroll-triggered or decorative animations
- Loading states: Subtle pulse on save indicators only

## Special Considerations

**Trust Signals:**
- Draft autosave indicator: Small "Saved" badge with timestamp in header
- Progress percentage displayed prominently
- Clear "Review Before Submit" section labeling

**Accessibility:**
- All interactive elements minimum 44px touch target
- High contrast ratios (4.5:1 minimum for body text)
- Clear focus indicators on all form fields
- Error summary at page top when validation fails

**Mobile Optimization:**
- Stack all multi-column layouts to single column below `lg` breakpoint
- Sticky bottom navigation always visible
- Section navigation collapses to dropdown on small screens
- Generous vertical spacing (`space-y-6` minimum) between form groups

**Review & Submit Page:**
- Group data by section with serif section headers
- Read-only fields styled as `bg-gray-50 border-gray-200 cursor-not-allowed`
- Edit buttons positioned top-right of each section group
- Final submit button: Extra large `py-4 text-lg` in plygreen with confirmation dialog