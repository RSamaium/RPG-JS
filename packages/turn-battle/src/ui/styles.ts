/**
 * Battle UI styles, injected once at client start so the plugin needs no CSS
 * import from the game. FFBE-inspired: deep blue glass panels, gold trims.
 */
export const battleCss = /* css */ `
/* Turn battle UI — FFBE-inspired: deep blue glass panels, gold trims, bold numbers. */
.tb-root {
  /* Built on @rpgjs/ui-css tokens: a game theme restyles the battle HUD too. */
  --tb-panel: var(--rpg-ui-panel-background, linear-gradient(180deg, rgba(28, 44, 92, 0.92), rgba(10, 18, 44, 0.94)));
  --tb-edge: var(--rpg-ui-border, rgba(150, 196, 255, 0.55));
  --tb-gold: var(--rpg-ui-selection, #ffd45c);
  --tb-ally: var(--rpg-ui-accent, #7fe6ff);
  --tb-enemy: var(--rpg-ui-danger, #ff6a6a);
  --tb-text: var(--rpg-ui-text, #f4f1ff);
  --tb-muted: var(--rpg-ui-text-muted, #a9b4d8);
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-family: var(--rpg-ui-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
  color: var(--tb-text);
  user-select: none;
  overflow: hidden;
}
.tb-root .rpg-ui-panel { pointer-events: auto; }
.tb-menu-title, .tb-result-title, .tb-banner, .tb-cutin-text strong {
  font-family: var(--rpg-ui-font-display, inherit);
}
.tb-root button {
  font: inherit;
  color: inherit;
  cursor: pointer;
  pointer-events: auto;
}

/* ------------------------------------------------ timeline */
.tb-timeline {
  position: absolute;
  top: 14px;
  left: 16px;
  right: 150px;
  height: 58px;
  display: flex;
  align-items: center;
}
.tb-timeline-rail {
  position: absolute;
  left: 20px;
  right: 0;
  top: 50%;
  height: 4px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--tb-gold), rgba(255, 212, 92, 0.15));
  box-shadow: 0 0 12px rgba(255, 212, 92, 0.45);
}
.tb-timeline-chips {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tb-chip {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--tb-ally);
  background: radial-gradient(circle at 50% 35%, #33406e, #0b1024);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  animation: tb-chip-in 0.35s cubic-bezier(0.2, 1.4, 0.4, 1) both;
  flex: none;
  position: relative;
}
.tb-chip.tb-enemy {
  border-color: var(--tb-enemy);
  background: radial-gradient(circle at 50% 35%, #5a2a3a, #1a0b12);
}
.tb-chip:nth-child(2) { animation-delay: 0.03s; }
.tb-chip:nth-child(3) { animation-delay: 0.06s; }
.tb-chip:nth-child(4) { animation-delay: 0.09s; }
.tb-chip:nth-child(5) { animation-delay: 0.12s; }
.tb-chip:nth-child(n + 6) { animation-delay: 0.15s; }
.tb-chip.tb-current {
  width: 50px;
  height: 50px;
  border-width: 3px;
  box-shadow: 0 0 0 3px rgba(255, 212, 92, 0.9), 0 0 22px rgba(255, 212, 92, 0.6);
  margin-right: 10px;
}
.tb-chip-face {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
}
.tb-preview .tb-chip:not(.tb-current) {
  opacity: 0.72;
}
.tb-chip.tb-landing {
  opacity: 1 !important;
  box-shadow: 0 0 0 3px #fff, 0 0 16px rgba(255, 255, 255, 0.8);
  transform: translateY(-6px);
}
.tb-chip.tb-landing::after {
  content: "▼";
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: #fff;
  text-shadow: 0 0 4px #000;
}
@keyframes tb-chip-in {
  from { transform: translateX(28px) scale(0.6); opacity: 0; }
}

.tb-options {
  position: absolute;
  top: 22px;
  right: 16px;
  display: flex;
  gap: 6px;
}
.tb-member.tb-hit-a { animation: tb-hit-a 0.38s ease-out; }
.tb-member.tb-hit-b { animation: tb-hit-b 0.38s ease-out; }
@keyframes tb-hit-a {
  0%, 100% { translate: 0 0; }
  20% { translate: -7px 2px; border-color: #ff7a7a; }
  40% { translate: 6px -2px; }
  60% { translate: -4px 1px; }
  80% { translate: 2px 0; }
}
@keyframes tb-hit-b {
  0%, 100% { translate: 0 0; }
  20% { translate: -7px 2px; border-color: #ff7a7a; }
  40% { translate: 6px -2px; }
  60% { translate: -4px 1px; }
  80% { translate: 2px 0; }
}
.tb-pill { border-radius: 999px; font-weight: 800; }

/* ------------------------------------------------ banner */
.tb-banner {
  position: absolute;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 280px;
  padding: 8px 40px;
  text-align: center;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.06em;
  background: linear-gradient(90deg, transparent, rgba(12, 22, 60, 0.92) 18%, rgba(12, 22, 60, 0.92) 82%, transparent);
  border-top: 1px solid rgba(127, 230, 255, 0.6);
  border-bottom: 1px solid rgba(127, 230, 255, 0.6);
  text-shadow: 0 2px 0 #000, 0 0 12px rgba(127, 230, 255, 0.6);
  animation: tb-banner 0.32s cubic-bezier(0.2, 1.3, 0.4, 1);
}
.tb-banner.tb-enemy {
  background: linear-gradient(90deg, transparent, rgba(60, 12, 24, 0.92) 18%, rgba(60, 12, 24, 0.92) 82%, transparent);
  border-color: rgba(255, 106, 106, 0.6);
  text-shadow: 0 2px 0 #000, 0 0 12px rgba(255, 106, 106, 0.6);
}
@keyframes tb-banner {
  from { transform: translateX(-50%) scaleX(0.2); opacity: 0; letter-spacing: 0.6em; }
}

/* ------------------------------------------------ command menu */
.tb-root .tb-menu {
  position: absolute !important;
  left: auto !important;
  right: 16px;
  top: 84px;
  width: 250px;
  padding: 0 !important;
  pointer-events: auto;
  background: var(--tb-panel);
  border: 1px solid var(--tb-edge);
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  animation: tb-menu-in 0.22s cubic-bezier(0.2, 1.2, 0.4, 1);
  transition: opacity 0.2s, transform 0.2s;
}
.tb-menu.tb-dim { opacity: 0.45; transform: translateX(12px); }
@keyframes tb-menu-in {
  from { transform: translateX(40px); opacity: 0; }
}
.tb-menu header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px 6px;
  border-bottom: 1px solid rgba(150, 196, 255, 0.25);
}
.tb-menu-title {
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 13px;
  color: var(--tb-gold);
}
.tb-back {
  border: 0;
  background: none;
  font-size: 14px;
  opacity: 0.8;
}
.tb-menu-list {
  display: flex;
  flex-direction: column;
  padding: 6px;
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
}
.tb-entry {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  text-align: left;
  font-size: 15px;
  font-weight: 700;
  position: relative;
}
.tb-entry-icon { opacity: 0.85; text-align: center; }
.tb-entry-hint { font-size: 12px; color: var(--tb-muted); font-weight: 600; }
.tb-entry.tb-focus {
  background: linear-gradient(90deg, rgba(127, 230, 255, 0.28), rgba(127, 230, 255, 0.04));
  border-color: rgba(127, 230, 255, 0.55);
}
.tb-entry.tb-focus::before {
  content: "▶";
  position: absolute;
  left: -12px;
  font-size: 11px;
  color: #fff;
  animation: tb-point 0.6s ease-in-out infinite alternate;
}
@keyframes tb-point { to { transform: translateX(4px); } }
.tb-entry.tb-disabled { opacity: 0.4; }
.tb-entry.tb-special {
  color: var(--tb-gold);
  background: linear-gradient(90deg, rgba(255, 212, 92, 0.25), transparent);
  animation: tb-glow 1.2s ease-in-out infinite alternate;
}
@keyframes tb-glow {
  from { box-shadow: 0 0 0 rgba(255, 212, 92, 0); }
  to { box-shadow: 0 0 14px rgba(255, 212, 92, 0.55); }
}
.tb-menu footer {
  padding: 7px 12px 9px;
  font-size: 12px;
  color: var(--tb-muted);
  border-top: 1px solid rgba(150, 196, 255, 0.2);
  min-height: 16px;
}

.tb-root .tb-target-hint {
  position: absolute !important;
  top: auto !important;
  right: auto !important;
  width: auto !important;
  left: 16px;
  bottom: 22px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 18px;
  border-radius: 999px;
  background: rgba(10, 18, 44, 0.88);
  border: 1px solid var(--tb-gold);
  pointer-events: auto;
  animation: tb-menu-in 0.2s;
}
.tb-target-hint strong { font-size: 16px; color: var(--tb-gold); }
/* The target being chosen: its face, HP, break gauge and what is known of it. */
.tb-root .tb-target-card {
  position: absolute !important;
  top: auto !important;
  right: auto !important;
  left: 16px;
  bottom: 22px;
  width: min(340px, calc(100% - 32px)) !important;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(10, 18, 44, 0.92);
  border: 1px solid var(--tb-gold);
  pointer-events: auto;
  animation: tb-menu-in 0.2s;
}
.tb-target-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tb-target-name { font-size: 16px; color: var(--tb-gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tb-target-card .tb-stat { grid-template-columns: 34px 1fr 64px; }
.tb-target-help { font-size: 11px; line-height: 1.35; color: var(--tb-muted); }
.tb-target-elements { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.tb-chip { font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px; border: 1px solid var(--tb-edge); color: var(--tb-muted); }
.tb-chip-weak { border-color: #ff9a5b; color: #ffb48a; }
.tb-target-back {
  flex: none;
  border: 1px solid var(--tb-edge);
  background: transparent;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
}
.tb-foe-hp i { background: linear-gradient(90deg, #ff5b5b, #ff8a5b); }
.tb-break i { background: linear-gradient(90deg, #f2b632, #ffd45c); }
.tb-break.tb-broken i { background: linear-gradient(90deg, #7f9bff, #9fb6ff); }
.tb-target-hint button {
  border: 1px solid var(--tb-edge);
  background: transparent;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
}
.tb-eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tb-muted);
}

/* ------------------------------------------------ coop */
.tb-waiting { border-color: var(--tb-edge) !important; }
.tb-waiting strong { color: #9fd8ff; }
.tb-waiting-unit { font-size: 13px; color: var(--tb-muted); }
.tb-countdown {
  min-width: 26px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  color: #0b1430;
  background: #9fd8ff;
}
.tb-menu header .tb-countdown { margin-left: auto; margin-right: 6px; }
.tb-countdown.tb-urgent { background: #ff6a5a; color: #fff; animation: tb-pulse 0.5s infinite alternate; }
@keyframes tb-pulse { to { transform: scale(1.15); } }
.tb-member-tag {
  margin-left: 6px;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9fd8ff;
}
.tb-member.tb-other:not(.tb-active) { opacity: 0.78; }
.tb-spectator-badge, .tb-audience {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #0b1430;
  background: #9fd8ff;
}
.tb-surrender.tb-armed { color: #fff !important; background: #c0392b !important; border-color: #ff6a5a !important; animation: tb-pulse 0.5s infinite alternate; }
.tb-surrender.tb-done { opacity: 0.6; pointer-events: none; }
.tb-audience { text-transform: none; background: rgba(10, 18, 44, 0.8); color: #9fd8ff; border: 1px solid #9fd8ff; }

/* ------------------------------------------------ party panel */
.tb-root .tb-party {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  gap: 8px;
  pointer-events: auto;
}
.tb-member {
  width: 206px;
  display: flex;
  gap: 8px;
  padding: 7px 9px !important;
  background: var(--tb-panel);
  border: 1px solid var(--tb-edge);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.tb-member.tb-active {
  transform: translateY(-8px);
  border-color: var(--tb-gold);
  box-shadow: 0 0 0 1px var(--tb-gold), 0 10px 24px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 212, 92, 0.35);
}
.tb-member.tb-dead { filter: grayscale(1) brightness(0.6); }
.tb-member.tb-guard .tb-member-face { box-shadow: 0 0 0 2px #7fb8ff, 0 0 10px #7fb8ff; }
.tb-member-face {
  width: 46px;
  height: 46px;
  flex: none;
  border-radius: 4px;
  background-color: #0b1024;
  background-repeat: no-repeat;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.tb-member-body { flex: 1; min-width: 0; }
.tb-member-name {
  font-weight: 900;
  font-size: 13px;
  letter-spacing: 0.03em;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tb-stat {
  display: grid;
  grid-template-columns: 20px 1fr 36px;
  align-items: center;
  gap: 5px;
  height: 14px;
}
.tb-stat-key { font-size: 10px; font-weight: 900; color: var(--tb-muted); }
.tb-stat-val {
  text-align: right;
  font-weight: 900;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 0 #000;
}
.tb-stat-val.tb-low { color: #ff7a7a; }
.tb-gauge {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.tb-gauge i {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 3px;
  transition: width 0.25s ease-out;
}
.tb-hp i { background: linear-gradient(90deg, #3fe07a, #b4ff7a); }
.tb-hp i.tb-lag { background: #fff; opacity: 0.85; transition: width 0.7s ease-in 0.35s; }
.tb-sp i { background: linear-gradient(90deg, #3a8cff, #7fd0ff); }
.tb-limit {
  margin-top: 4px;
  height: 4px;
}
.tb-limit i { background: linear-gradient(90deg, #ff9a3c, var(--tb-gold)); }
.tb-limit-full .tb-limit i {
  background: linear-gradient(90deg, #fff4c2, var(--tb-gold), #fff4c2);
  background-size: 200% 100%;
  animation: tb-shine 0.8s linear infinite;
}
@keyframes tb-shine { to { background-position: -200% 0; } }

/* ------------------------------------------------ cut-in */
.tb-cutin {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.55);
  animation: tb-fade 0.2s;
}
.tb-cutin-lines {
  position: absolute;
  inset: -20%;
  background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255, 255, 255, 0.16) 0deg 1.2deg, transparent 1.2deg 7deg);
  animation: tb-spin 3s linear infinite;
  mix-blend-mode: screen;
}
@keyframes tb-spin { to { transform: rotate(360deg); } }
.tb-cutin-band {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 230px;
  transform: translateY(-50%) skewY(-6deg);
  background: linear-gradient(90deg, rgba(255, 212, 92, 0.95), rgba(255, 140, 60, 0.9) 45%, rgba(20, 10, 40, 0.95) 46%);
  box-shadow: 0 0 60px rgba(255, 212, 92, 0.6);
  display: flex;
  align-items: center;
  overflow: hidden;
  animation: tb-band 0.45s cubic-bezier(0.2, 1.1, 0.3, 1);
}
@keyframes tb-band { from { transform: translateY(-50%) skewY(-6deg) translateX(-100%); } }
.tb-cutin-face {
  position: relative;
  width: 300px;
  height: 300px;
  flex: none;
  margin-left: 12%;
  background-repeat: no-repeat;
  filter: drop-shadow(8px 8px 0 rgba(0, 0, 0, 0.35));
  animation: tb-face 1.9s ease-out;
}
@keyframes tb-face { from { transform: translateX(-80px) scale(1.2); } }
.tb-cutin-text {
  transform: skewY(6deg);
  margin-left: 6%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: tb-text 0.6s 0.15s both cubic-bezier(0.2, 1.3, 0.4, 1);
}
@keyframes tb-text { from { transform: skewY(6deg) translateX(120px); opacity: 0; } }
.tb-cutin-text small { font-size: 14px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--tb-gold); }
.tb-cutin-text strong { font-size: 34px; font-style: italic; text-shadow: 0 3px 0 #000, 0 0 18px rgba(255, 212, 92, 0.8); }
.tb-letterbox {
  position: absolute;
  left: 0;
  right: 0;
  height: 12%;
  background: #000;
  animation: tb-letter 0.3s ease-out;
}
.tb-letterbox.tb-top { top: 0; }
.tb-letterbox.tb-bottom { bottom: 0; }
@keyframes tb-letter { from { height: 0; } }
.tb-skip {
  position: absolute;
  right: 20px;
  bottom: calc(12% + 14px);
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.6);
  font-size: 13px;
  font-weight: 800;
}
@keyframes tb-fade { from { opacity: 0; } }

/* ------------------------------------------------ result */
.tb-result {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: linear-gradient(90deg, rgba(4, 8, 22, 0.85), rgba(4, 8, 22, 0.25) 60%, transparent);
  animation: tb-fade 0.4s;
}
.tb-result.tb-defeat { background: rgba(10, 0, 4, 0.72); }
.tb-result-title {
  position: absolute;
  top: 12%;
  left: 6%;
  font-size: 54px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.05em;
  color: var(--tb-gold);
  text-shadow: 0 4px 0 #000, 0 0 30px rgba(255, 212, 92, 0.7);
  animation: tb-title 0.6s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.tb-defeat .tb-result-title { color: #ff7a7a; text-shadow: 0 4px 0 #000, 0 0 30px rgba(255, 60, 60, 0.6); }
@keyframes tb-title { from { transform: translateX(-60px) scale(1.4); opacity: 0; } }
.tb-root .tb-result-panel {
  position: absolute !important;
  top: calc(12% + 90px);
  left: 6%;
  width: min(420px, 80vw);
  background: var(--tb-panel);
  border: 1px solid var(--tb-edge);
  border-radius: 6px;
  padding: 6px 16px 12px;
  animation: tb-menu-in 0.45s 0.2s both;
}
.tb-result-panel header {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--tb-muted);
  padding: 6px 0 8px;
  border-bottom: 1px solid rgba(150, 196, 255, 0.25);
}
.tb-result-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid rgba(150, 196, 255, 0.12);
  font-weight: 700;
}
.tb-result-row b { font-size: 22px; font-variant-numeric: tabular-nums; }
.tb-drops div { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.tb-drops em { font-style: normal; color: #bfe9ff; }
.tb-bonuses {
  position: absolute;
  top: calc(12% + 100px);
  right: 8%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}
.tb-bonus {
  font-size: 22px;
  font-weight: 900;
  font-style: italic;
  color: var(--tb-gold);
  text-shadow: 0 3px 0 #000, 0 0 14px rgba(255, 212, 92, 0.7);
  animation: tb-bonus 0.5s cubic-bezier(0.2, 1.5, 0.4, 1) both;
}
.tb-bonus:nth-child(1) { animation-delay: 0.6s; }
.tb-bonus:nth-child(2) { animation-delay: 0.85s; }
.tb-bonus:nth-child(3) { animation-delay: 1.1s; }
@keyframes tb-bonus { from { transform: translateX(80px) scale(1.6); opacity: 0; } }
.tb-root .tb-continue {
  position: absolute !important;
  left: auto !important;
  top: auto !important;
  right: 6%;
  bottom: 8%;
  padding: 10px 26px;
  border-radius: 4px;
  border: 1px solid var(--tb-gold);
  background: linear-gradient(180deg, rgba(255, 212, 92, 0.3), rgba(255, 212, 92, 0.08));
  font-weight: 900;
  font-size: 16px;
  letter-spacing: 0.08em;
  animation: tb-fade 0.4s 1s both;
}

.tb-toast {
  position: absolute;
  top: 90px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  border-radius: 6px;
  background: rgba(60, 10, 20, 0.9);
  border: 1px solid #ff7a7a;
  font-weight: 700;
  animation: tb-menu-in 0.2s;
}

.tb-reduced *, .tb-reduced *::before, .tb-reduced *::after {
  animation-duration: 0.01s !important;
  animation-iteration-count: 1 !important;
}

@media (max-width: 760px) {
  .tb-party { left: 8px; right: 8px; bottom: 8px; flex-wrap: wrap; }
  .tb-member { flex: 1 1 150px; width: auto; }
  .tb-menu { left: auto; right: 8px; width: 210px; top: 70px; }
  .tb-target-hint { bottom: 150px; }
  .tb-timeline { left: 8px; right: 80px; }
  .tb-result-title { font-size: 38px; }
  .tb-bonuses { top: auto; bottom: 22%; right: 6%; }
  .tb-cutin-face { width: 200px; height: 200px; margin-left: 2%; }
  .tb-cutin-text strong { font-size: 22px; }
}

/* Result screen owns the whole view. */
.tb-phase-result .tb-party,
.tb-phase-result .tb-timeline,
.tb-phase-result .tb-options {
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
`;

export function injectBattleStyles() {
  if (typeof document === "undefined" || document.getElementById("turn-battle-styles")) return;
  const style = document.createElement("style");
  style.id = "turn-battle-styles";
  style.textContent = battleCss;
  document.head.appendChild(style);
}
