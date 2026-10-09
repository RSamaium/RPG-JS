# ADR 002: Signe Public Boundary

- Status: Accepted
- Target: RPGJS v5 stable

## Context

Signe provides dependency injection, reactivity, synchronization, and room
coordination. Directly exposing third-party types gives advanced users power,
but also makes changes to Signe part of RPGJS's public compatibility contract.

## Decision

Signe is an official internal foundation with documented advanced extension
points. Stable gameplay APIs should expose RPGJS-owned types and behavior where
a Signe type is not intrinsically necessary to the user task.

- synchronized gameplay properties use an RPGJS-owned public contract
- room and transport behavior is accessed through RPGJS adapters
- DI providers remain accepted through the documented provider boundary
- direct Signe APIs used by advanced plugins are identified separately from the
  stable gameplay surface
- any Signe type intentionally exported by a stable RPGJS API is versioned as an
  RPGJS public contract

## Consequences

- some existing public signatures may need RPGJS type aliases or facades before v5 stable
- internal Signe upgrades must pass gameplay and declaration compatibility tests
- advanced documentation must distinguish stable RPGJS contracts from direct Signe usage

## Validation

- public declaration snapshots identify all Signe types reachable from stable exports
- core gameplay examples do not require importing from `@signe/*`
- synchronization implementation changes do not alter gameplay contract tests
