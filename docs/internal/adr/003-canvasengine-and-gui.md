# ADR 003: CanvasEngine and GUI Boundaries

- Status: Accepted
- Target: RPGJS v5 stable

## Context

RPGJS v4 made extensive use of DOM frameworks for GUI. RPGJS v5 uses
CanvasEngine as the default game rendering and component environment while
retaining Vue for appropriate DOM integrations. Gameplay commands must not
depend on one visual implementation.

## Decision

- CanvasEngine is the official v5 renderer and component contract for `.ce` game components.
- PixiJS details remain implementation details unless explicitly documented.
- Player-facing gameplay commands operate through renderer-neutral GUI contracts.
- Vue remains an official stable integration for DOM overlays and low-level RPG UI building blocks.
- Feature-specific UI belongs to its feature module and exposes replaceable components or slots.
- `@rpgjs/ui-css` defines the DOM styling and theming contract independently of gameplay behavior.

## Consequences

- dialog, choice, menu, save/load, notification, and chat behavior can be restyled or replaced
- CanvasEngine components must not acquire server gameplay authority
- feature modules ship default UI without forcing that UI on games
- theme packages can change appearance without copying component behavior

## Validation

- GUI registrations now declare an explicit `canvas` or `vue` renderer while
  retaining the legacy component-shape fallback.
- `@rpgjs/chat` separates authoritative server behavior from its replaceable
  default CanvasEngine component.
- the default and pixel themes are tested against the same chat DOM fixture.
- production bundle-boundary tests exercise direct imports, re-exports,
  dynamic imports, source maps, and runtime execution while rejecting client
  rendering code from the server output.
