# ADR 004: V4 Compatibility Policy

- Status: Proposed
- Target: RPGJS v5 stable

## Context

V5 modernizes project startup, module composition, synchronization, and
rendering while retaining RPGJS's established gameplay model. Compatibility
must preserve real games without forcing the v5 implementation to reproduce
every v4 compiler detail indefinitely.

## Proposed decision

- `compatibilityV4Plugin()` is the supported bridge for v4 layouts, configuration, flagged imports, and assets.
- v4 gameplay concepts and documented hooks are preserved or mapped with explicit behavior tests.
- decorated classes remain supported throughout the v5 major line.
- native v5 modules are the preferred destination for new development.
- every v4 capability is classified as compatible, translated,
  migration-required, deprecated, or unsupported before v5 stable.
- compatibility claims are validated with representative real projects and save data.

## Consequences

- the compatibility plugin is a product surface, not a temporary untested build helper
- unsupported behavior requires a reason, an alternative, and migration guidance
- v5 minor releases cannot silently remove a v4 compatibility path shipped in v5.0
- compatibility tests include production artifacts and runtime behavior

## Validation

- official and representative v4 projects build and run on the v5 runtime
- the published migration matrix matches observed behavior
- hook ordering, event modes, map transfers, GUI commands, and save migration have contract tests
