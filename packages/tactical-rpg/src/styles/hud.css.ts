/** CSS of the tactical battle (kept as a string so that it is installed by `installTacticalStyles`). */
export default `/*
 * The HUD of a battle, laid over the map: a phase chip and the controls at the top, a dock at the bottom that never moves (the card of
 * the unit, what to do, the end of the phase). It comes after the older sheets and replaces their top bar, objective card and bottom panel.
 */
.t-controls {
  position: fixed;
  top: 12px;
  right: 14px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
}
.t-controls button {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--gold) 33%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ink) 80%, transparent);
  color: var(--cream);
  font-size: 14px;
  line-height: 1;
}
.t-controls button:hover,
.t-controls button[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--gold), white 35%);
  background: color-mix(in srgb, color-mix(in srgb, var(--ink), white 5%) 90%, transparent);
}
.t-controls .t-watchers,
.t-controls .t-watch-badge {
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--gold) 33%, transparent);
  border-radius: 17px;
  background: color-mix(in srgb, var(--ink) 80%, transparent);
  font-size: 12px;
}
.t-controls .t-watch-badge button {
  width: auto;
  height: auto;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 10px;
}

.t-status {
  position: fixed;
  top: 12px;
  left: 14px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: min(420px, 60vw);
  pointer-events: none;
}
.t-phase {
  display: inline-flex;
  align-items: baseline;
  align-self: flex-start;
  gap: 12px;
  padding: 7px 22px 7px 14px;
  border-left: 3px solid var(--t-accent);
  background: linear-gradient(90deg, color-mix(in srgb, color-mix(in srgb, var(--ink), white 10%) 90%, transparent), color-mix(in srgb, color-mix(in srgb, var(--ink), white 10%) 0%, transparent));
  color: color-mix(in srgb, var(--t-accent), white 85%);
}
.t-phase.enemy {
  border-left-color: var(--t-danger);
  background: linear-gradient(90deg, color-mix(in srgb, color-mix(in srgb, var(--t-danger), black 75%) 90%, transparent), color-mix(in srgb, color-mix(in srgb, var(--t-danger), black 75%) 0%, transparent));
  color: color-mix(in srgb, var(--t-danger), white 85%);
}
.t-phase b {
  font: 700 15px var(--rpg-ui-font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.t-phase span {
  font-size: 11px;
  letter-spacing: 0.16em;
  opacity: 0.85;
  text-transform: uppercase;
}
.t-phase .t-timer {
  min-width: 3.2em;
  padding: 1px 8px;
  border: 1px solid #ffffff33;
  border-radius: 10px;
  background: color-mix(in srgb, color-mix(in srgb, var(--ink), black 60%) 80%, transparent);
  font: 700 13px var(--rpg-ui-font-mono);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.t-phase .t-timer.urgent {
  border-color: color-mix(in srgb, var(--t-danger), white 10%);
  color: color-mix(in srgb, var(--t-danger), white 40%);
}
.t-status p {
  margin: 0;
  padding-left: 14px;
  font-size: 12px;
  color: var(--cream);
  text-shadow: 0 1px 3px #000c;
}
.t-status p span {
  margin-right: 6px;
  color: var(--gold);
}

.t-dock {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(260px, 340px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  min-height: 96px;
  padding: 10px 20px max(12px, env(safe-area-inset-bottom));
  background: linear-gradient(0deg, color-mix(in srgb, color-mix(in srgb, var(--ink), black 55%) 95%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--ink), black 55%) 77%, transparent) 62%, color-mix(in srgb, color-mix(in srgb, var(--ink), black 55%) 0%, transparent) 100%);
  pointer-events: none;
}
.t-dock .t-hint {
  position: static;
  justify-self: center;
  max-width: 560px;
  margin: 0;
  padding: 6px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--ink) 80%, transparent);
  color: color-mix(in srgb, var(--gold), white 50%);
  font-size: 12px;
  text-align: center;
}
.t-dock .t-order {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin: 0;
  pointer-events: auto;
}
.t-dock .t-phase-button,
.t-dock .t-gold-button {
  min-width: 112px;
  min-height: 40px;
}

.t-dock-card {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 72px;
  padding: 6px 12px 6px 8px;
  border: 1px solid color-mix(in srgb, var(--gold) 27%, transparent);
  border-left: 3px solid var(--t-accent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--ink) 94%, transparent);
  color: var(--cream);
  pointer-events: none;
}
.t-dock-card.enemy {
  border-left-color: var(--t-danger);
}
.t-dock-card.empty {
  justify-content: center;
  border-left-color: color-mix(in srgb, var(--gold) 33%, transparent);
}
.t-dock-portrait {
  position: relative;
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--ink);
}
.t-dock-portrait .t-portrait {
  width: 100%;
  height: 100%;
}
.t-dock-copy {
  flex: 1;
  min-width: 0;
}
.t-dock-copy .t-eyebrow {
  font-size: 8px;
}
.t-dock-copy h3 {
  margin: 1px 0 4px;
  overflow: hidden;
  font: 16px var(--rpg-ui-font-display);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.t-dock-copy h3 small {
  margin-left: 6px;
  color: color-mix(in srgb, var(--gold), black 10%);
  font-size: 10px;
}
.t-dock-stat {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 6px;
  margin: 2px 0;
  font-size: 9px;
  color: color-mix(in srgb, var(--muted), white 30%);
}
.t-dock-stat strong {
  min-width: 60px;
  color: var(--cream);
  font-size: 10px;
  font-weight: normal;
  text-align: right;
}
.t-dock-stat .t-detail-track {
  position: relative;
  height: 5px;
  background: #ffffff1f;
}
.t-dock-forecast {
  display: block;
  margin-top: 2px;
  color: #ffb38a;
  font-size: 10px;
  font-style: normal;
}
.t-dock-empty {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 849px) {
  .t-dock {
    grid-template-columns: 1fr auto;
    height: auto;
    gap: 8px;
  }
  .t-dock .t-hint {
    display: none;
  }
}

.t-unit-menu .t-menu-item.hidden,
.t-flee.hidden {
  display: none;
}

/* The skill list opens above the dock on the right, so the units stay in sight */
.t-skill-menu {
  position: fixed;
  right: 24px;
  bottom: 112px;
  left: auto;
  width: min(470px, calc(100vw - 48px));
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  animation: none;
}
`;
