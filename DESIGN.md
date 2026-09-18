---
name: Civics Plus Civic Authority
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#784b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies modern civic infrastructure: institutional integrity delivered with consumer-grade clarity, accessibility, and empathy. The interface directly serves diverse constituents navigating governmental services, municipal voting, civic reporting, and public initiatives.

The aesthetic blends **Modern Institutional** and **Tactile Utility**:
- High-contrast, clean visual planes built over crisp slate-tinted surfaces.
- Tactile, oversized touchpoints (scaled 20% larger than typical consumer controls) designed for one-handed operation across demographics, motor abilities, and outdoor viewing environments.
- Bilingual parity (English and Tamil) treated with identical visual gravity and optical balance.
- Vibrant, optimistic gradient accents deployed strategically on civic milestones, public metrics, and citizen impact indicators to replace bureaucratic sterility with civic pride.

## Colors
The palette balances constitutional authority with modern digital utility. The foundation uses crisp slate neutrals (`#F8FAFC` base surface, `#0F172A` high-legibility text) to eliminate optical fatigue and ensure AAA compliance across all critical civic states.

### Palette Architecture
- **Primary Civic Blue (`#2563EB`)**: Anchors public administration, authoritative actions, core navigation, and identity verification.
- **Civic Success Green (`#10B981`)**: Communicates resolved municipal tickets, completed forms, verified status, and positive community outcomes.
- **Civic Warning Amber (`#F59E0B`)**: Highlights impending deadlines, permit expirations, and traffic or utility advisories without inducing panic.
- **Civic Alert Red (`#EF4444`)**: Reserved exclusively for critical emergency broadcasts, missed statutory deadlines, and field errors.
- **Slate Neutral Stack**: Ranging from `#0F172A` (primary text, 15.8:1 contrast against white) through `#64748b` (metadata, helper text) to `#F1F5F9` (card surfaces and field fills).

### Accent Gradients (Civic Metrics Only)
Civic data points, citizen scorecards, and public progress indicators feature directional gradients:
- **Participation Pulse**: `linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)`
- **Environmental & Resolution Metric**: `linear-gradient(135deg, #10B981 0%, #34D399 100%)`
- **Urgent Community Notice**: `linear-gradient(135deg, #F59E0B 0%, #F97316 100%)`

## Typography
Typographic clarity is paramount for civic services. The design system leverages **Inter** for default interfaces, paired natively with high-legibility Tamil system/web typography (such as Noto Sans Tamil / Arima) matched to identical x-heights and baseline metrics.

### Bilingual Handling (English & Tamil)
- **Vertical Rhythm Compensation**: Tamil script scripts carry taller ascenders and descenders; line-heights are normalized using a minimum `1.5x` multiplier for all Tamil body passages to avoid glyph clipping.
- **Paired Headings**: Where English and Tamil appear synchronously (e.g., dual-language service cards), the secondary language is styled at `label-md` directly underneath the primary language's `headline-sm` with a fixed `0.25rem` gap.
- **Font Weight Allocation**: Inter 600/700 is reserved for actionable triggers and top-level civic categories. Regular 400 is strictly optimized for instructional paragraphs and status tracking copy.

## Layout & Spacing
The layout relies on an 8pt rhythmic grid engineered primarily for single-column mobile viewports, expanding to structured multi-column layouts on tablets and kiosks.

- **Mobile Viewport (up to 640px)**: 4-column fluid layout with `1rem` (16px) margins and gutters. Single-stack priority ensures zero side-scroll accidents and guaranteed legibility under sunlight.
- **Tablet & Split-Screen Viewport (641px - 1024px)**: 8-column layout with `1.5rem` (24px) gutters and `2rem` (32px) margins, dividing lists and detailed verification drawers into 3:5 proportioned workspaces.
- **Touch-First Clearances**: All interactive items maintain a strict vertical spacing margin of at least `0.75rem` (12px) between adjacent triggers to prevent unintended touch triggers.

## Elevation & Depth
Elevation in the design system uses crisp structural layering rather than dramatic artificial z-space, keeping interfaces grounded, official, and performant across low-tier mobile chipsets.

- **Base Layer (Canvas)**: `#F8FAFC` (Slate 50). A low-glare, pristine field surface.
- **Level 1 (Card & Module Surfaces)**: Solid `#FFFFFF` enclosed by a deliberate `1px` subtle outline (`#E2E8F0`) paired with a soft ambient shadow: `0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.04)`.
- **Level 2 (Active Sheets, Dialogs, Sticky Action Bars)**: `#FFFFFF` framed by `#CBD5E1` with elevated ambient displacement: `0 12px 24px -6px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Urgent Civic Modals & Emergency Overlays)**: Bordered with `#94A3B8` over a 40% `#0F172A` dimming scrim with zero backdrop-blur dependencies to ensure complete contrast compliance.

## Shapes
The shape language follows a structured **Rounded** standard (`roundedness: 2` = 0.5rem / 8px default, scaling to 1rem / 16px for cards and containers).

- **Standard Elements (Buttons, Inputs, Badges)**: Feature `0.5rem` (8px) corner radii. This softens institutional rigidity while retaining structured formality.
- **Cards and Display Containers**: Feature `1rem` (16px) corner radii, establishing visually defined compartments for discrete civic functions (e.g., ballot status, trash collection schedules).
- **Hero Metrics and Pill Chips**: Metric cards utilize `1.5rem` (24px) for distinct visual separation from operational workflows.

## Components

### Buttons
All primary and secondary action buttons feature 20% expanded physical dimensions to ensure effortless civic accessibility:
- **Base Height**: Minimum `58px` (exceeding standard 48px targets by >20%).
- **Primary Button**: Solid `#2563EB` with `#FFFFFF` label text (`label-lg`), `0.5rem` radius, 16px horizontal padding. Active state darkens to `#1D4ED8`.
- **Secondary Action**: `#FFFFFF` background with a crisp `1.5px` border in `#CBD5E1`, `#0F172A` label text.
- **Destructive/Emergency Button**: Solid `#EF4444` background with `#FFFFFF` label text.

### Cards
- **Standard Civic Card**: Built with `#FFFFFF` fill, `1rem` radius, `1px` stroke in `#E2E8F0`, and `space-lg` internal padding.
- **Metric Card**: Incorporates a top accent border (4px) or right-aligned glyph bearing the designated gradient (e.g., Participation Pulse). Contains bilingual headline metadata paired with oversized tabular numbers.

### Input Fields
- **Container Height**: `56px` with `0.5rem` border radius.
- **Borders & Fills**: `#FFFFFF` surface with `1.5px` border in `#94A3B8`. On focus, border transitions to `2px` solid `#2563EB` with a `3px` focus ring in `rgba(37, 99, 235, 0.15)`.
- **Labels**: Persistent floating labels paired with helper text in `#64748B` positioned beneath the field at `body-sm`.

### Checkboxes & Radio Buttons
- **Touch Bounds**: Enclosed within a padded `48px x 48px` tap target, housing an enlarged `24px x 24px` graphic indicator.
- **Selection State**: `#2563EB` fill with a crisp white check/dot. Unselected border is `2px` solid `#94A3B8`.

### Chips & Badges
- **Status Badges**: Pill-shaped (`rounded-full`), `32px` height, featuring low-saturation background tints paired with high-contrast text:
  - Active/Verified: `#D1FAE5` fill, `#065F46` text.
  - In Progress/Pending: `#FEF3C7` fill, `#92400E` text.
  - Alert/Urgent: `#FEE2E2` fill, `#991B1B` text.

### Civic Specific: Bilingual Service Selector
- Stacked bilingual segmented control: `48px` item height, active item highlighted with an elevated white tab over a `#E2E8F0` track, displaying the primary English term above the Tamil equivalent in synchronized typography.