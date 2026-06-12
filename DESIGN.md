# Design System

## Direction

RevAuto-inspired automotive product interface: true black and carbon surfaces,
a single racing-red accent, cinematic vehicle photography, angular details, and
compact enterprise information architecture.

## Color

- Canvas: `#070707`
- Sidebar: `#090909`
- Surface: `#111111`
- Elevated surface: `#171717`
- Strong surface: `#202020`
- Primary red: `#ef1b2d`
- Primary hover: `#ff3344`
- Text: `#f5f5f5`
- Muted text: `#a3a3a3`
- Borders: translucent white, normally 8-14%
- Semantic colors remain green, amber, and rose only for real states.

## Typography

Use Cairo for Arabic UI and IBM Plex Sans Arabic for numeric data. Headings are
heavy, compact, and high contrast. Operational labels remain restrained and
readable.

## Shape

Cards use 8-10px corners. Buttons and controls use 6-8px corners. Automotive
feature panels may use clipped diagonal accents, but standard forms and tables
retain conventional geometry.

## Motion

- Most UI transitions: 160-220ms ease-out.
- Page and list reveals: short opacity and vertical movement with small stagger.
- Hero imagery: pointer parallax and slow ambient drift.
- Buttons: subtle lift on hover and physical press feedback.
- Vehicle cards: image zoom, highlight sweep, and directional arrow movement.
- All motion has a reduced-motion alternative.

## Layout

Keep the existing sidebar and top navigation structure. The dashboard uses one
cinematic hero followed by operational modules. Inventory prioritizes visual
vehicle cards while preserving the table view for dense work.

## Components

- Primary actions: solid racing red with white text.
- Active navigation: red-tinted surface and a compact active marker.
- Cards: carbon fill, thin neutral border, no default glass blur.
- Data tables and forms: restrained surfaces and strong focus rings.
- Hero: photographic background, dark scrims, red light accents, and direct
  operational actions.
