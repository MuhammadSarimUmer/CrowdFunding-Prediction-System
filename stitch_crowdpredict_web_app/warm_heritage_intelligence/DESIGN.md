---
name: Warm Heritage Intelligence
colors:
  surface: '#fbf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#3f4942'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f3f1ec'
  outline: '#6e7a71'
  outline-variant: '#bec9bf'
  surface-tint: '#006c44'
  primary: '#005a38'
  on-primary: '#ffffff'
  primary-container: '#00754a'
  on-primary-container: '#99f8c2'
  inverse-primary: '#7cd9a5'
  secondary: '#146b4a'
  on-secondary: '#ffffff'
  secondary-container: '#a0f1c5'
  on-secondary-container: '#1b704e'
  tertiary: '#674803'
  on-tertiary: '#ffffff'
  tertiary-container: '#82601c'
  on-tertiary-container: '#ffe0af'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#97f6c0'
  primary-fixed-dim: '#7cd9a5'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005232'
  secondary-fixed: '#a2f3c8'
  secondary-fixed-dim: '#87d7ad'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005235'
  tertiary-fixed: '#ffdea8'
  tertiary-fixed-dim: '#ecc073'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5e4200'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.015em
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 2rem
  margin-sm: 1rem
  margin-lg: 4rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system blends the grounded warmth, artisanal prestige, and approachable hospitality of heritage café branding with the clinical precision of predictive machine learning analytics. Built for CrowdPredict—an intelligent analytics platform forecasting crowdfunding campaign outcomes—it rejects the cold, alienated techno-futurism of typical fintech dashboards. 

Instead, it evokes reassurance, human craftsmanship, and measured optimism. The aesthetic combines clean corporate minimalism with tactile hospitality cues: generous negative space, intentional editorial rhythm, warm paper-like textures, and deep forest-green color blocking. Structural hierarchy is formed strictly through surface color bands and spatial distance rather than hairline borders or artificial gradients.

## Colors

Color orchestrates calm clarity, narrative weight, and institutional confidence across the predictive interface.

### Brand Palettes
- **Canvas Ground**: `#f2f0eb` (Warm Cream). The base canvas across all standard screens. Never substitute with cold grays or pure `#ffffff`.
- **Card Surface**: `#ffffff` (Pure White). Elevated resting surface for predictive metrics, input forms, and data visualizations.
- **Primary Brand / Headings**: `#006241` (Starbucks Green). Reserved for page titles, primary stat figures, and top-tier headers.
- **Primary Action / Links**: `#00754a` (Green Accent). Interactive triggers, primary buttons, highlighted text links, and active controls.
- **Deep Immersion**: `#1e3932` (House Green). High-impact dark feature bands, hero analytical banners, summary panels, and terminal footers. On these surfaces, primary typography is `#ffffff` and secondary text shifts to `rgba(255, 255, 255, 0.70)`.
- **Subtle Fill / Success**: `#d4e9e2` (Green Light). Valid state backgrounds, active progress bar tracks, and soft confirmation pills.
- **Prestige Accent**: `#cba258` (Warm Gold). Strictly isolated to the "Active Model" operational state pill and specialized reward-tier badges. It must never be applied to general buttons, text copy, or secondary icons.

### Text & Feedback Semantics
- **Text Primary**: `rgba(0, 0, 0, 0.87)` on light surfaces.
- **Text Secondary**: `rgba(0, 0, 0, 0.58)` on light surfaces.
- **Critical Alert / Error**: `#c82014` (Failure risk, underperforming threshold alerts, invalid fields).
- **Warning**: `#fbbc05` (Moderate risk flags, campaign anomalies).
- **Rules**: Never apply linear, radial, or mesh gradients. Never utilize divider rule lines; boundaries must emerge purely from solid color-blocked background transitions and calculated whitespace.

## Typography

The typography centers exclusively on `Inter`, utilizing slight tracking compression (`-0.01em` standard) to ensure data density feels intentional and editorial.

- **Hierarchy through Contrast**: Visual prominence relies on strict color modulation (`#006241` for lead headlines, `rgba(0,0,0,0.87)` for primary body, `rgba(0,0,0,0.58)` for secondary meta tags) and defined font weights (`400`, `600`, and `700`) rather than decorative sizing or ornamental typefaces.
- **Numbers & Metrics**: Predictive probabilities, monetary outputs, and conversion stats should be rendered using `headline-xl` or `headline-lg` in `#006241` or `#ffffff` (when nested within `#1e3932` container bands).

## Layout & Spacing

The layout is built upon an adaptive 12-column fluid grid system paired with strict full-bleed horizontal content blocks.

- **Grid Dynamics**:
  - **Desktop (>= 1024px)**: 12-column grid, `margin-lg` (4rem / 64px) outer page margins, `gutter-lg` (2rem / 32px) intra-column gutters. Maximum content reading well caps at 1280px.
  - **Tablet (768px - 1023px)**: 8-column grid, `margin` (2rem / 32px) margins, `gutter` (1.5rem / 24px) gutters.
  - **Mobile (< 768px)**: 4-column grid, `margin-sm` (1rem / 16px) margins, `gutter-sm` (1rem / 16px) gutters. Complex prediction grids stack vertically into single-column cards.
- **Structure via Color Blocking**: Never separate page chapters or card groups with border lines. Group information using alternating background section bands (`#f2f0eb` canvas alternating with `#1e3932` feature sections) separated by `space-xl` breathing room.

## Elevation & Depth

Spatial layering in this design system rejects heavy blurs, dramatic drop shadows, and high-tech skeuomorphism in favor of tactile paper layering.

- **Card Plane**: Elevated items sit on `#ffffff` surfaces layered atop the `#f2f0eb` ground. They use a precise, dual-layer ambient shadow to suggest clean, cut paper:
  - `box-shadow: 0 0 0.5px rgba(0, 0, 0, 0.14), 0 1px 1px rgba(0, 0, 0, 0.24)`
- **Feature Layering**: Secondary data readouts, code snippets, or nested inputs within cards use `#f2f0eb` or `#d4e9e2` fills with zero shadow (`box-shadow: none`), relying entirely on surface contrast.
- **Deep Feature Bands**: `#1e3932` panels sit flat on the z-axis, creating natural visual gravity.
- **Floating Action Elevation**: The floating circular action button is elevated above all viewport elements with a dedicated floating depth:
  - `box-shadow: 0 4px 12px rgba(0, 98, 65, 0.35), 0 2px 4px rgba(0, 0, 0, 0.15)`

## Shapes

The geometric logic uses two disciplined tiers of border radii:

- **Cards & Structured Containers**: Exactly `12px` (`0.75rem`), balancing geometric precision with approachable warmth.
- **Interactive Controls & Status Indicators**: Full pill geometry (`rounded-full` / `9999px` / `50px`). All buttons, filter pills, input wrappers, active tags, and the floating button employ continuous circular caps.

## Components

### Buttons
- **Primary Button**: Pill-shaped (`border-radius: 9999px`), solid `#00754a` fill, `#ffffff` text, font weight `600`, horizontal padding `24px`, vertical padding `12px`. Hover state shifts fill to `#006241`. Active click state applies `transform: scale(0.95)` with `transition: transform 100ms ease`.
- **Secondary Button**: Pill-shaped, transparent background, `1.5px` solid `#00754a` stroke, `#00754a` text. Hover shifts to `#d4e9e2` fill. Active state applies `scale(0.95)`.
- **Dark Feature Band Button**: In `#1e3932` sections, buttons use solid `#ffffff` fill with `#1e3932` text. Hover shifts background to `#f2f0eb`. Active state applies `scale(0.95)`.

### Chips & Badges
- **Active Model Badge**: Pill-shaped, solid `#cba258` fill, `#ffffff` text, font weight `600`, font size `12px`, letter spacing `0.02em`.
- **Reward-Tier Pill**: Pill-shaped, subtle tint background `rgba(203, 162, 88, 0.15)`, text `#cba258`, border `1px solid #cba258`.
- **Standard Filter Chip**: Pill-shaped, `#ffffff` card surface, text `rgba(0,0,0,0.87)`, border `1px solid transparent`. Active filter switches to `#00754a` fill with `#ffffff` text.

### Inputs & Form Fields
- **Container**: Pill-shaped or `12px` rounded white container, height `48px`, horizontal padding `16px`, background `#ffffff`. No resting border line; uses ambient card shadow.
- **Focus State**: Solid `2px` focus outline in `#00754a` with no fuzzy glow.
- **Valid Input**: Subtle fill `#d4e9e2` with `#006241` confirmation icon.
- **Error Input**: Solid `1.5px` border `#c82014`, text `#c82014`.

### Cards & Analytical Panels
- Resting on `#f2f0eb` canvas, surfaces are `#ffffff`, `border-radius: 12px`, with shadow `0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)`.
- No dividing lines within cards. Separate card headers, KPI metric groups, and charts using `1.5rem` (`space-lg`) vertical gaps or soft `#f2f0eb` inner container blocks.

### Floating Circular Action Button (FAB)
- Positioned fixed `bottom: 32px`, `right: 32px`.
- Exact size: `56px` by `56px`, perfectly circular (`border-radius: 50%`).
- Fill: `#00754a`, icon color `#ffffff` (size `24px`).
- Shadow: `0 4px 12px rgba(0, 98, 65, 0.35), 0 2px 4px rgba(0, 0, 0, 0.15)`.
- Active state: `transform: scale(0.92)`.

### Prediction Probability Gauges
- Dual-track circular or horizontal meter: background track uses `#d4e9e2`, active progress track uses `#00754a` (or `#c82014` if outcome risk is critical). No gradients along the path.