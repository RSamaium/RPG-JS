/** CSS of the tactical battle (kept as a string so that it is installed by `installTacticalStyles`). */
export default `/* The sheet is loaded in the game of every project that plugs the module: it styles the HUD (\`.t-shell\`) and nothing else. */
.t-shell {
  color-scheme: dark;
  /* Every colour and font of the HUD comes from the theme of the game (\`@rpgjs/ui-css\`, \`--rpg-ui-*\`); the second value is the fallback
     when the theme sheet is not loaded. */
  --gold: var(--rpg-ui-selection, #d9b779);
  --cream: var(--rpg-ui-text, #f4e8cc);
  --ink: var(--rpg-ui-bg, #101720);
  --muted: var(--rpg-ui-text-muted, #8f9da7);
  --line: color-mix(in srgb, var(--gold) 24%, transparent);
  --t-danger: var(--rpg-ui-danger, #f17b76);
  --t-accent: var(--rpg-ui-accent, #6bb6ff);
  --t-success: var(--rpg-ui-success, #60c69f);
  font-family: var(--rpg-ui-font, system-ui, sans-serif);
}
.t-shell,
.t-shell *,
.t-shell *::before,
.t-shell *::after {
  box-sizing: border-box;
}
.t-shell button {
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
}
.t-shell button[aria-disabled="true"] {
  cursor: default;
}
.t-shell button:focus-visible {
  outline: 2px solid var(--cream);
  outline-offset: 4px;
}
.t-shell kbd {
  font-family: inherit;
  font-size: 9px;
  border: 1px solid #b9c0c13a;
  border-radius: 3px;
  padding: 2px 4px;
  color: color-mix(in srgb, var(--muted), white 15%);
}
.t-shell {
  position: fixed;
  inset: 0;
  z-index: 20;
  color: var(--cream);
  pointer-events: none;
  font-size: 12px;
  font-family: var(--rpg-ui-font);
  text-shadow: 0 1px 2px #0008;
}
.t-shell button,
.t-panel,
.t-intro,
.t-modal {
  pointer-events: auto;
}
.t-shell h1,
.t-shell h2,
.t-shell h3,
.t-shell p {
  margin: 0;
}
.t-shell button {
  color: inherit;
}
.t-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 160px color-mix(in srgb, color-mix(in srgb, var(--ink), black 70%) 60%, transparent);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, color-mix(in srgb, var(--ink), black 50%) 87%, transparent),
    transparent 22%,
    transparent 70%,
    color-mix(in srgb, color-mix(in srgb, var(--ink), black 50%) 87%, transparent)
  );
}
.t-topbar {
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 38px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, color-mix(in srgb, var(--ink) 96%, transparent), color-mix(in srgb, var(--ink) 61%, transparent));
  position: relative;
}
.t-brand {
  display: flex;
  gap: 14px;
  align-items: center;
}
.t-brand-mark {
  font-size: 45px;
  color: var(--gold);
  line-height: 1;
}
.t-brand h1 {
  font-family: var(--rpg-ui-font-display);
  font-size: 23px;
  letter-spacing: 6px;
  font-weight: normal;
}
.t-brand div > span {
  display: block;
  color: var(--gold);
  font-size: 8px;
  letter-spacing: 3.4px;
  margin-top: 5px;
}
.t-location {
  text-align: center;
}
.t-location > span {
  display: block;
  font-size: 9px;
  letter-spacing: 4px;
  color: var(--gold);
  margin-bottom: 7px;
}
.t-location strong {
  font-family: var(--rpg-ui-font-display);
  font-weight: normal;
  font-size: 17px;
  letter-spacing: 1px;
}
.t-options {
  display: flex;
  gap: 8px;
}
.t-options button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, color-mix(in srgb, var(--ink), white 5%) 53%, transparent);
  border-radius: 50%;
  color: var(--gold);
  font-size: 17px;
}
.t-options button[aria-pressed="true"] {
  background: color-mix(in srgb, color-mix(in srgb, var(--gold), black 30%) 38%, transparent);
}
.t-intro {
  position: absolute;
  left: 8%;
  top: 17%;
  width: 370px;
  animation: rise 0.8s ease both;
}
.t-intro::before {
  content: "";
  position: absolute;
  inset: -80px -65px;
  z-index: -1;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--ink) 93%, transparent) 40%, color-mix(in srgb, var(--ink) 0%, transparent) 72%);
}
.t-eyebrow {
  font-size: 9px;
  letter-spacing: 2.4px;
  color: var(--gold);
  text-transform: uppercase;
  line-height: 1.8;
}
.t-eyebrow span {
  margin: 0 8px;
}
.t-intro h2 {
  font-family: var(--rpg-ui-font-display);
  /* Encounter names run longer than a two-word title. */
  font-size: clamp(40px, 5vw, 60px);
  font-weight: normal;
  line-height: 1;
  letter-spacing: 5px;
  margin-top: 18px;
  color: var(--cream);
  text-shadow: 0 6px 30px #000;
}
.t-intro h2 em {
  font-weight: normal;
  font-style: normal;
  font-size: 95px;
  letter-spacing: 18px;
  color: var(--gold);
}
.t-rule {
  height: 1px;
  background: linear-gradient(90deg, var(--gold), transparent);
  width: 240px;
  margin: 28px 0 22px;
}
.t-intro p {
  color: color-mix(in srgb, var(--muted), white 35%);
  font-size: 14px;
  line-height: 1.8;
  max-width: 320px;
}
.t-intro-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 19px;
  margin: 24px 0;
  color: var(--gold);
  font-size: 11px;
}
.t-intro > small {
  display: block;
  color: var(--muted);
  font-size: 8px;
  letter-spacing: 2px;
  margin-top: 17px;
}
.t-gold-button {
  border: 1px solid color-mix(in srgb, var(--gold), white 30%);
  min-height: 43px;
  padding: 13px 20px;
  background: linear-gradient(105deg, color-mix(in srgb, var(--gold), black 15%), color-mix(in srgb, var(--gold), white 25%));
  color: var(--ink) !important;
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  transition:
    filter 0.15s,
    transform 0.15s;
  box-shadow: 0 4px 18px #0004;
}
.t-gold-button:hover {
  filter: brightness(1.14);
  transform: translateY(-1px);
}
.t-gold-button[aria-disabled="true"] {
  opacity: 0.5;
}
.t-loading {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, color-mix(in srgb, var(--ink), white 10%), var(--ink));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
.t-loading-ring {
  border: 1px solid var(--gold);
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  font-size: 35px;
  color: var(--gold);
  animation: pulse 2s ease infinite;
  transform: rotate(45deg);
}
.t-loading h2 {
  font-family: var(--rpg-ui-font-display);
  font-weight: normal;
  letter-spacing: 2px;
}
.t-loading p {
  color: var(--muted);
}
.t-objective {
  position: absolute;
  left: 38px;
  top: 116px;
  max-width: 240px;
  animation: rise 0.6s ease;
}
.t-objective h2 {
  font-family: var(--rpg-ui-font-display);
  font-size: 22px;
  line-height: 1.4;
  font-weight: normal;
  margin: 7px 0 12px;
}
.t-objective p {
  font-size: 11px;
  line-height: 1.7;
  color: color-mix(in srgb, var(--muted), white 40%);
}
.t-objective p span {
  color: var(--gold);
  margin-right: 5px;
}
.t-enemy-pips {
  display: flex;
  flex-wrap: wrap;
  max-width: 260px;
  gap: 10px;
  margin-top: 17px;
}
.t-enemy-pips span {
  width: 28px;
  height: 28px;
  border: 1px solid color-mix(in srgb, color-mix(in srgb, var(--t-danger), black 10%) 50%, transparent);
  display: grid;
  place-items: center;
  transform: rotate(-4deg);
  background: color-mix(in srgb, color-mix(in srgb, var(--t-danger), black 80%) 72%, transparent);
  color: color-mix(in srgb, var(--t-danger), white 15%);
  font-size: 17px;
}
.t-enemy-pips .fallen {
  opacity: 0.2;
  text-decoration: line-through;
}
.t-round {
  position: absolute;
  right: 40px;
  top: 114px;
  text-align: center;
  width: 150px;
  border-top: 1px solid var(--gold);
  padding-top: 12px;
}
.t-round > span {
  font-size: 9px;
  letter-spacing: 4px;
  color: var(--gold);
}
.t-round strong {
  font-family: var(--rpg-ui-font-display);
  display: block;
  font-size: 54px;
  font-weight: normal;
  line-height: 1.2;
}
.t-round small {
  font-size: 8px;
  letter-spacing: 1.6px;
  color: color-mix(in srgb, var(--t-success), white 45%);
}
.t-round.enemy small {
  color: color-mix(in srgb, var(--t-danger), white 15%);
}
.t-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 26px 10px;
}
.t-hint {
  width: fit-content;
  max-width: 90%;
  margin: 0 auto 14px;
  background: color-mix(in srgb, var(--ink) 85%, transparent);
  border: 1px solid var(--line);
  padding: 10px 19px;
  color: color-mix(in srgb, var(--muted), white 70%);
  font-size: 11px;
  line-height: 1.5;
  backdrop-filter: blur(12px);
}
.t-hint > span {
  color: var(--gold);
  margin-right: 10px;
}
.t-command-deck {
  display: grid;
  grid-template-columns: minmax(350px, 1.12fr) minmax(345px, 1fr) 155px;
  gap: 8px;
}
.t-panel {
  background: linear-gradient(135deg, color-mix(in srgb, color-mix(in srgb, var(--ink), white 5%) 96%, transparent), color-mix(in srgb, var(--ink) 97%, transparent));
  border: 1px solid var(--line);
  box-shadow: 0 10px 40px #0006;
  backdrop-filter: blur(12px);
}
.t-roster,
.t-actions {
  padding: 13px 14px 10px;
}
.t-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 10px;
  letter-spacing: 1.5px;
  color: var(--gold);
}
.t-section-title small {
  font-size: 8px;
  color: color-mix(in srgb, var(--muted), black 15%);
  letter-spacing: 1px;
}
.t-section-title em {
  color: color-mix(in srgb, var(--muted), white 10%);
  font-style: normal;
  letter-spacing: 0.5px;
}
.t-roster-cards {
  display: flex;
  gap: 7px;
}
.t-unit-card {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  background: color-mix(in srgb, var(--ink) 33%, transparent);
  border: 1px solid color-mix(in srgb, color-mix(in srgb, var(--muted), black 10%) 15%, transparent);
  padding: 8px 7px;
  flex: 1;
  min-width: 0;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.2s;
}
.t-unit-card.selected {
  background: linear-gradient(100deg, color-mix(in srgb, color-mix(in srgb, var(--gold), black 15%) 14%, transparent), var(--ink));
  border-color: color-mix(in srgb, color-mix(in srgb, var(--gold), black 10%) 69%, transparent);
  box-shadow: inset 0 -2px var(--gold);
}
.t-unit-card:hover:not([aria-disabled="true"]) {
  transform: translateY(-3px);
  background: color-mix(in srgb, color-mix(in srgb, var(--ink), white 20%) 40%, transparent);
}
.t-unit-card.exhausted {
  opacity: 0.48;
}
.t-crest {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 33px;
  height: 40px;
  border: 1px solid color-mix(in srgb, color-mix(in srgb, var(--gold), black 10%) 53%, transparent);
  background: linear-gradient(150deg, color-mix(in srgb, var(--gold), black 50%), #242524);
  clip-path: polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%);
  font-size: 23px;
  color: color-mix(in srgb, var(--gold), white 30%);
}
.t-crest.archer {
  background: linear-gradient(150deg, color-mix(in srgb, var(--t-success), black 50%), color-mix(in srgb, var(--ink), white 5%));
  border-color: color-mix(in srgb, var(--t-success), white 25%);
  color: color-mix(in srgb, var(--t-success), white 45%);
}
.t-crest.mage {
  background: linear-gradient(150deg, #594465, color-mix(in srgb, var(--ink), white 10%));
  border-color: #c1a5db;
  color: #d4baff;
}
.t-card-info {
  min-width: 0;
  flex: 1;
}
.t-card-name {
  font-family: var(--rpg-ui-font-display);
  font-size: 14px;
  display: block;
}
.t-card-name small {
  font-family: var(--rpg-ui-font);
  display: block;
  font-size: 8px;
  margin: 3px 0 6px;
  color: color-mix(in srgb, var(--muted), white 10%);
}
.t-hp-track {
  display: block;
  height: 3px;
  background: #ffffff16;
}
.t-hp-track > span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--t-success), black 15%), color-mix(in srgb, var(--t-success), white 50%));
  transition: width 0.5s;
}
.t-card-status {
  display: block;
  font-size: 8px;
  color: color-mix(in srgb, var(--muted), white 10%);
  margin-top: 5px;
  white-space: nowrap;
}
.t-card-status b {
  display: none;
}
.t-action-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}
.t-action-buttons button {
  position: relative;
  min-height: 59px;
  padding: 5px 4px;
  border: 1px solid color-mix(in srgb, color-mix(in srgb, var(--muted), black 30%) 23%, transparent);
  background: color-mix(in srgb, var(--ink), white 5%);
  font-size: 10px;
  transition: background 0.2s;
}
.t-action-buttons button > span {
  display: block;
  font-size: 22px;
  color: color-mix(in srgb, var(--muted), white 40%);
  margin-bottom: 3px;
}
.t-action-buttons button.active {
  border-color: var(--gold);
  background: color-mix(in srgb, color-mix(in srgb, var(--gold), black 55%) 29%, transparent);
}
.t-action-buttons button.active > span {
  color: var(--gold);
}
.t-action-buttons button[aria-disabled="true"] {
  opacity: 0.3;
}
.t-action-buttons button:not([aria-disabled="true"]):hover {
  background: color-mix(in srgb, color-mix(in srgb, var(--t-accent), black 55%) 40%, transparent);
}
.t-action-buttons kbd {
  position: absolute;
  left: 4px;
  top: 3px;
  font-size: 7px;
  padding: 1px 3px;
}
.t-action-buttons i {
  position: absolute;
  right: 6px;
  top: 5px;
  font-size: 9px;
  color: var(--gold);
  font-style: normal;
}
.t-action-detail {
  font-size: 9px;
  color: var(--muted);
  margin-top: 8px;
  min-height: 11px;
}
.t-order {
  padding: 15px 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 9px;
}
.t-order .t-gold-button {
  padding: 12px 11px;
  gap: 9px;
  font-size: 11px;
}
.t-phase-button {
  border: 1px solid color-mix(in srgb, var(--gold), black 15%);
  background: color-mix(in srgb, color-mix(in srgb, var(--gold), black 10%) 6%, transparent);
  padding: 15px 9px;
  font-size: 11px;
  letter-spacing: 0.6px;
}
.t-phase-button > span {
  margin-left: 10px;
  color: var(--gold);
}
.t-phase-button[aria-disabled="true"] {
  opacity: 0.3;
}
.t-order > small {
  text-align: center;
  font-size: 8px;
  color: var(--muted);
  letter-spacing: 1.5px;
}
.t-text-button {
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--muted), white 25%) !important;
  font-size: 10px;
}
.t-text-button kbd {
  margin-left: 7px;
}
.t-footnote {
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: var(--muted);
  padding: 10px 0 0;
  letter-spacing: 0.3px;
}
.t-footnote > span:last-child {
  color: var(--gold);
  letter-spacing: 1.6px;
}
.t-phase-banner {
  position: absolute;
  top: 39%;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 26px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--ink) 91%, transparent) 30%,
    color-mix(in srgb, var(--ink) 91%, transparent) 70%,
    transparent
  );
  border-top: 1px solid color-mix(in srgb, var(--gold) 33%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--gold) 33%, transparent);
  animation: banner 1.8s ease both;
}
.t-phase-banner h2 {
  font-family: var(--rpg-ui-font-display);
  font-size: 28px;
  font-weight: normal;
  letter-spacing: 7px;
}
.t-phase-banner > span {
  color: var(--gold);
  font-size: 15px;
}
.t-forecast {
  position: absolute;
  right: 38px;
  top: 290px;
  width: 235px;
  padding: 18px;
  animation: rise 0.2s ease;
}
.t-forecast h3 {
  font-family: var(--rpg-ui-font-display);
  font-size: 18px;
  font-weight: normal;
  margin: 12px 0 16px;
}
.t-forecast h3 span {
  margin: 0 9px;
  color: var(--gold);
}
.t-forecast-body {
  display: flex;
  gap: 25px;
  align-items: center;
  border-top: 1px solid var(--line);
  padding-top: 15px;
}
.t-forecast-body > strong {
  font-family: var(--rpg-ui-font-display);
  font-size: 38px;
  font-weight: normal;
  color: color-mix(in srgb, var(--gold), white 35%);
}
.t-forecast-body small {
  display: block;
  font-family: var(--rpg-ui-font);
  font-size: 8px;
  letter-spacing: 1px;
  color: var(--muted);
  margin-top: 4px;
}
.t-forecast-body > div {
  color: color-mix(in srgb, var(--muted), white 25%);
  font-size: 12px;
}
.t-forecast-body b {
  color: color-mix(in srgb, var(--t-danger), white 30%);
  font-size: 19px;
}
.t-modal-backdrop {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, color-mix(in srgb, var(--ink), black 50%) 79%, transparent);
  backdrop-filter: blur(7px);
  pointer-events: auto;
}
.t-modal {
  width: min(90vw, 530px);
  padding: 42px;
  border: 1px solid var(--gold);
  background: linear-gradient(140deg, color-mix(in srgb, var(--ink), white 10%), var(--ink));
  box-shadow: 0 20px 90px #0009;
  animation: rise 0.5s ease;
}
.t-modal h2 {
  font-family: var(--rpg-ui-font-display);
  font-weight: normal;
  font-size: 30px;
  letter-spacing: 2px;
  margin: 12px 0 20px;
}
.t-modal p {
  font-size: 13px;
  line-height: 1.9;
  color: color-mix(in srgb, var(--muted), white 40%);
  margin-bottom: 22px;
}
.t-result {
  text-align: center;
}
.t-result-sigil {
  font-size: 70px;
  color: var(--gold);
  display: block;
  margin-bottom: 20px;
}
.t-result-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin: 27px 0;
  font-size: 9px;
  letter-spacing: 2px;
  color: color-mix(in srgb, var(--muted), white 20%);
}
.t-result-stats b {
  display: block;
  font-family: var(--rpg-ui-font-display);
  font-size: 32px;
  font-weight: normal;
  letter-spacing: 0;
  color: var(--cream);
  margin-top: 8px;
}
.t-result .t-gold-button {
  margin: auto;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes pulse {
  50% {
    opacity: 0.4;
  }
}
@keyframes banner {
  0% {
    opacity: 0;
    transform: scaleX(0.88);
  }
  15%,
  75% {
    opacity: 1;
    transform: scaleX(1);
  }
  100% {
    opacity: 0;
    transform: scaleX(1.04);
  }
}
.t-reduced * {
  animation: none !important;
  transition: none !important;
}
@media (min-width: 1500px) {
  .t-bottom {
    padding: 0 45px 18px;
  }
  .t-command-deck {
    grid-template-columns: 1.2fr 1fr 190px;
    gap: 12px;
  }
  .t-unit-card {
    padding: 13px 10px;
  }
  .t-crest {
    width: 43px;
    height: 51px;
  }
  .t-card-name small {
    display: inline;
    margin-left: 8px;
  }
  .t-card-status b {
    display: inline;
    float: right;
    font-weight: normal;
    font-size: 7px;
  }
  .t-intro {
    left: 10%;
    top: 26%;
  }
}
@media (max-width: 1000px) {
  .t-command-deck {
    grid-template-columns: 1fr 1fr 120px;
  }
  .t-topbar {
    padding: 0 20px;
    height: 64px;
  }
  .t-brand h1 {
    font-size: 18px;
  }
  .t-location {
    display: none;
  }
  .t-objective {
    top: 88px;
    left: 22px;
    max-width: 175px;
  }
  .t-objective h2 {
    font-size: 18px;
  }
  .t-round {
    right: 20px;
    top: 88px;
    width: 110px;
  }
  .t-round strong {
    font-size: 42px;
  }
  .t-bottom {
    padding: 0 12px 8px;
  }
  .t-card-name {
    font-size: 12px;
  }
  .t-unit-card {
    padding: 6px 4px;
    gap: 5px;
  }
  .t-crest {
    width: 23px;
    height: 33px;
    font-size: 19px;
  }
  .t-section-title {
    letter-spacing: 0.6px;
    font-size: 9px;
  }
  .t-section-title small {
    display: none;
  }
  .t-roster,
  .t-actions {
    padding: 9px;
  }
  .t-footnote > span:first-child {
    max-width: 65%;
    font-size: 7px;
  }
  .t-forecast {
    right: 20px;
    top: 235px;
    width: 190px;
    padding: 13px;
  }
  .t-intro {
    left: 6%;
    top: 19%;
  }
  .t-intro h2 {
    font-size: 55px;
  }
  .t-intro h2 em {
    font-size: 67px;
  }
}
@media (max-width: 700px) {
  .t-topbar {
    height: 53px;
    padding: 0 14px;
  }
  .t-brand-mark {
    font-size: 29px;
  }
  .t-brand {
    gap: 9px;
  }
  .t-brand h1 {
    font-size: 15px;
    letter-spacing: 4px;
  }
  .t-brand div > span {
    font-size: 6px;
    letter-spacing: 2px;
  }
  .t-options {
    gap: 5px;
  }
  .t-options button {
    width: 28px;
    height: 28px;
  }
  .t-objective {
    top: 74px;
    left: 15px;
    max-width: 195px;
  }
  .t-objective h2 {
    font-size: 16px;
    margin: 3px 0;
  }
  .t-objective p {
    font-size: 10px;
  }
  .t-enemy-pips {
    gap: 6px;
    margin-top: 8px;
  }
  .t-enemy-pips span {
    width: 21px;
    height: 21px;
    font-size: 13px;
  }
  .t-round {
    top: 73px;
    right: 15px;
    width: 95px;
    padding-top: 8px;
  }
  .t-round strong {
    font-size: 35px;
  }
  .t-round small {
    font-size: 6px;
  }
  .t-command-deck {
    grid-template-columns: 1fr 102px;
    gap: 5px;
  }
  .t-roster {
    grid-column: 1/-1;
    padding: 7px;
  }
  .t-roster .t-section-title {
    display: none;
  }
  .t-roster-cards {
    gap: 5px;
  }
  .t-unit-card {
    padding: 5px 7px;
  }
  .t-crest {
    height: 28px;
  }
  .t-card-name small {
    display: inline;
    font-size: 7px;
    margin-left: 5px;
  }
  .t-card-status {
    font-size: 7px;
  }
  .t-hp-track {
    margin-top: 5px;
  }
  .t-card-status b {
    display: none;
  }
  .t-actions {
    padding: 7px;
  }
  .t-actions .t-section-title {
    margin-bottom: 6px;
  }
  .t-action-buttons button {
    min-height: 44px;
    font-size: 9px;
  }
  .t-action-buttons button > span {
    font-size: 16px;
  }
  .t-action-buttons kbd {
    display: none;
  }
  .t-action-detail {
    display: none;
  }
  .t-order {
    padding: 8px 6px;
  }
  .t-phase-button {
    padding: 12px 5px;
    font-size: 9px;
  }
  .t-order .t-gold-button {
    font-size: 9px;
    padding: 10px 6px;
    min-height: 35px;
  }
  .t-footnote {
    display: none;
  }
  .t-hint {
    font-size: 10px;
    padding: 7px 10px;
    margin-bottom: 7px;
  }
  .t-bottom {
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
  .t-phase-banner h2 {
    font-size: 17px;
    letter-spacing: 3px;
  }
  .t-phase-banner {
    gap: 15px;
    padding: 20px;
  }
  .t-forecast {
    top: auto;
    bottom: 235px;
    right: 12px;
    width: 180px;
  }
  .t-forecast h3 {
    font-size: 14px;
    margin: 5px 0 9px;
  }
  .t-forecast-body {
    padding-top: 6px;
    gap: 15px;
  }
  .t-forecast-body > strong {
    font-size: 26px;
  }
  .t-intro {
    top: 24%;
    left: 8%;
    width: 84%;
  }
  .t-intro h2 {
    font-size: 68px;
  }
  .t-intro h2 em {
    font-size: 83px;
  }
  .t-intro p {
    font-size: 12px;
    max-width: 280px;
  }
  .t-intro-roles {
    font-size: 10px;
  }
  .t-modal {
    padding: 26px;
  }
  .t-modal h2 {
    font-size: 23px;
  }
}
@media (max-height: 520px) and (orientation: landscape) {
  .t-topbar {
    height: 43px;
  }
  .t-brand h1 {
    font-size: 15px;
  }
  .t-brand div > span {
    display: none;
  }
  .t-objective {
    top: 59px;
    left: 15px;
    max-width: 165px;
  }
  .t-objective h2 {
    font-size: 14px;
  }
  .t-objective p {
    font-size: 9px;
  }
  .t-enemy-pips {
    margin-top: 6px;
  }
  .t-round {
    top: 56px;
    right: 16px;
  }
  .t-round strong {
    font-size: 30px;
  }
  .t-bottom {
    padding-bottom: 5px;
  }
  .t-roster,
  .t-actions {
    padding: 6px;
  }
  .t-section-title {
    margin-bottom: 5px;
  }
  .t-action-buttons button {
    min-height: 43px;
    font-size: 9px;
  }
  .t-action-buttons button > span {
    font-size: 17px;
  }
  .t-action-detail,
  .t-footnote {
    display: none;
  }
  .t-unit-card {
    padding: 4px;
  }
  .t-hint {
    padding: 5px 12px;
    margin-bottom: 5px;
    font-size: 9px;
  }
  .t-order {
    padding: 6px;
  }
  .t-intro {
    top: 18%;
    width: 310px;
  }
  .t-intro h2 {
    font-size: 42px;
    margin-top: 12px;
  }
  .t-intro h2 em {
    font-size: 51px;
  }
  .t-rule {
    margin: 13px 0;
  }
  .t-intro p {
    font-size: 11px;
    line-height: 1.5;
  }
  .t-intro-roles {
    margin: 12px 0;
  }
  .t-intro > small {
    display: none;
  }
  .t-forecast {
    top: 160px;
    padding: 9px;
    width: 170px;
  }
  .t-forecast h3 {
    font-size: 14px;
    margin: 4px 0 6px;
  }
  .t-forecast-body {
    padding-top: 5px;
  }
  .t-forecast-body > strong {
    font-size: 26px;
  }
}
/* Studio's exploration HUD is replaced by the squad command deck while a battle is on (and only then: the map keeps its HUD outside of it). */
body:has(.t-shell) .rpg-hud,
body:has(.t-shell) .rpg-ui-notifications {
  display: none !important;
}
.t-shell button[aria-disabled="true"] {
  pointer-events: none;
  cursor: default;
}
.t-flourish {
  position: absolute;
  top: 22%;
  left: 0;
  display: flex;
  gap: 18px;
  align-items: center;
  padding: 20px 70px 20px 35px;
  background: linear-gradient(100deg, color-mix(in srgb, var(--ink) 98%, transparent), #463851e8, color-mix(in srgb, var(--ink) 0%, transparent));
  border-block: 1px solid color-mix(in srgb, color-mix(in srgb, var(--gold), white 20%) 53%, transparent);
  animation: flourish-in 0.25s ease-out;
  pointer-events: none;
}
.t-flourish > span {
  font-size: 55px;
  color: color-mix(in srgb, var(--gold), white 55%);
}
.t-flourish small {
  display: block;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: var(--gold);
  font-size: 9px;
}
.t-flourish strong {
  display: block;
  font:
    italic 27px var(--rpg-ui-font-display);
  margin-top: 8px;
  color: var(--cream);
}
@keyframes flourish-in {
  from {
    opacity: 0;
    transform: translateX(-60px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.t-reduced .t-flourish {
  animation: none;
}
@media (max-width: 700px) {
  .t-flourish {
    top: 24%;
    padding: 12px 35px 12px 18px;
  }
  .t-flourish > span {
    font-size: 34px;
  }
  .t-flourish strong {
    font-size: 21px;
  }
}
.t-command-deck.is-idle{grid-template-columns:minmax(350px,600px) 160px;justify-content:center}
.t-unit-detail{position:absolute;left:28px;top:280px;width:260px;display:flex;align-items:stretch;overflow:hidden;animation:unit-reveal .32s cubic-bezier(.2,.8,.2,1);border-left:2px solid var(--gold)}
.t-detail-art{width:104px;flex-shrink:0;position:relative;background:radial-gradient(ellipse at 45% 35%,color-mix(in srgb, color-mix(in srgb, var(--gold), black 35%) 33%, transparent),var(--ink));overflow:hidden}
.t-portrait{position:absolute;left:0;top:14px;width:104px;height:116px;background-repeat:no-repeat;filter:drop-shadow(0 4px 8px #0007)}
.t-detail-art.archer .t-portrait{filter:hue-rotate(22deg) drop-shadow(0 4px 8px #0007)}
.t-detail-art.mage .t-portrait{filter:hue-rotate(-22deg) drop-shadow(0 4px 8px #0007)}
.t-detail-sigil{position:absolute;left:15px;bottom:13px;font-size:36px;color:color-mix(in srgb, color-mix(in srgb, var(--gold), white 20%) 27%, transparent)}
.t-detail-copy{padding:15px 12px;flex:1;min-width:0}.t-detail-copy .t-eyebrow{font-size:7px}.t-detail-copy h3{font:23px var(--rpg-ui-font-display);margin:4px 0}.t-detail-copy>small{color:color-mix(in srgb, var(--gold), black 10%);font-size:9px}.t-detail-copy p{font-size:10px;line-height:1.5;color:color-mix(in srgb, var(--muted), white 15%);margin:9px 0 14px}.t-detail-stat{display:flex;justify-content:space-between;font-size:9px;color:color-mix(in srgb, var(--muted), white 30%);margin:7px 0 4px}.t-detail-stat strong{font-size:10px;font-weight:normal;color:var(--cream)}.t-detail-track{height:3px;background:#ffffff15}.t-detail-track>span{display:block;height:100%;background:color-mix(in srgb, var(--t-success), white 25%);transition:width .4s}.t-detail-track.mana>span{background:color-mix(in srgb, var(--t-accent), white 35%)}.t-detail-copy .t-detail-note{display:block;line-height:1.4;margin-top:12px;font-size:8px;color:var(--muted)}.t-unit-detail.enemy{border-left-color:var(--t-danger)}.t-unit-detail.enemy .t-detail-art{background:radial-gradient(ellipse at 45% 35%,color-mix(in srgb, color-mix(in srgb, var(--t-danger), black 45%) 33%, transparent),var(--ink))}
.t-skill-menu{position:absolute;right:190px;bottom:205px;width:470px;padding:20px;z-index:35;animation:unit-reveal .22s ease-out;box-shadow:0 15px 70px #000b}.t-skill-menu>header{display:flex;justify-content:space-between;align-items:center}.t-skill-menu h3{font:23px var(--rpg-ui-font-display);margin-top:5px}.t-skill-menu>header>button{border:1px solid var(--line);background:transparent;width:32px;height:32px;font-size:23px}.t-skill-menu>p{font-size:10px;line-height:1.5;margin:10px 0 14px;color:color-mix(in srgb, var(--muted), white 30%)}.t-skill-list{display:flex;flex-direction:column;gap:8px}.t-skill-choice{display:flex;align-items:center;gap:13px;border:1px solid color-mix(in srgb, color-mix(in srgb, var(--muted), white 20%) 20%, transparent);background:color-mix(in srgb, var(--ink), white 5%);text-align:left;padding:13px;width:100%;transition:background .15s}.t-skill-choice.focused,.t-skill-choice:hover{border-color:var(--gold);background:color-mix(in srgb, var(--ink), white 20%)}.t-skill-choice[aria-disabled="true"]{opacity:.45}.t-skill-copy{flex:1}.t-skill-copy>strong{display:block;font:16px var(--rpg-ui-font-display);color:var(--cream)}.t-skill-copy>span{display:block;font-size:10px;line-height:1.5;margin:6px 0;color:color-mix(in srgb, var(--muted), white 30%)}.t-skill-copy>small{font-size:8px;color:var(--gold);letter-spacing:.5px}.t-skill-cost{display:flex;flex-direction:column;align-items:center;font-size:9px;color:color-mix(in srgb, var(--t-accent), white 30%);min-width:50px}.t-skill-cost>b{font:25px var(--rpg-ui-font-display)}.t-skill-cost>small{font-size:7px;color:color-mix(in srgb, var(--muted), white 10%);margin-top:8px}.t-area-icon{display:grid;grid-template-columns:repeat(3,9px);gap:3px;flex-shrink:0}.t-area-icon i{width:9px;height:9px;border:1px solid color-mix(in srgb, color-mix(in srgb, var(--muted), black 15%) 40%, transparent)}.t-area-icon i.lit{background:var(--gold);box-shadow:0 0 7px color-mix(in srgb, color-mix(in srgb, var(--gold), black 10%) 33%, transparent)}.t-area-icon.fire i.lit{background:#f6a06e}.t-area-icon.frost i.lit{background:color-mix(in srgb, var(--t-accent), white 30%)}.t-skill-reason{color:color-mix(in srgb, var(--t-danger), white 20%);font-size:9px}.t-skill-menu>footer{display:flex;justify-content:space-between;gap:8px;margin-top:14px;font-size:8px;color:var(--muted)}.t-skill-menu>footer>small{font-size:8px}
@keyframes unit-reveal{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
.t-reduced .t-unit-detail,.t-reduced .t-skill-menu{animation:none}
@media(min-width:1400px){.t-unit-detail{top:300px;width:285px}.t-detail-art{width:115px}.t-portrait{width:115px;height:128px}}
@media(max-width:1000px){.t-unit-detail{top:210px;left:14px;width:205px}.t-detail-art{width:75px}.t-portrait{width:75px;height:85px}.t-detail-copy{padding:10px}.t-detail-copy p{font-size:9px}.t-skill-menu{right:20px;width:420px}}
@media(max-width:700px){.t-command-deck.is-idle{grid-template-columns:1fr 100px}.t-command-deck.is-idle .t-roster{grid-column:auto}.t-command-deck.is-idle .t-crest{display:none}.t-command-deck.is-idle .t-card-name small{display:none}.t-command-deck.is-idle .t-unit-card{padding:6px 4px}.t-unit-detail{top:162px;left:12px;width:188px}.t-detail-art{width:67px}.t-portrait{width:67px;height:76px;top:12px}.t-detail-copy h3{font-size:19px}.t-detail-copy p{display:none}.t-detail-copy .t-detail-note{font-size:7px;margin-top:7px}.t-detail-sigil{font-size:25px;left:12px}.t-skill-menu{bottom:205px;left:12px;right:12px;width:auto;padding:14px}.t-skill-choice{padding:10px;gap:9px}.t-skill-copy>strong{font-size:14px}.t-skill-copy>span{font-size:9px}.t-skill-menu>footer{font-size:7px}.t-area-icon{grid-template-columns:repeat(3,7px);gap:2px}.t-area-icon i{width:7px;height:7px}}
@media(max-height:550px) and (min-width:701px){.t-unit-detail{top:140px;width:200px}.t-detail-copy p{display:none}.t-skill-menu{bottom:150px;width:400px;padding:12px}.t-skill-menu>p,.t-skill-menu>footer{display:none}.t-skill-choice{padding:8px}.t-skill-menu h3{font-size:18px}.t-skill-list{margin-top:8px}}
.t-command-deck>.t-roster{order:0}.t-command-deck>.t-actions{order:1}.t-command-deck>.t-order{order:2}
@media(max-width:700px){.t-unit-detail{top:160px;width:210px}.t-detail-copy>.t-eyebrow,.t-detail-copy .t-detail-note{display:none}.t-detail-copy{padding:8px 10px}.t-detail-copy h3{font-size:17px;margin:0}.t-detail-copy>small{font-size:8px}.t-detail-stat{font-size:8px;margin:5px 0 3px}.t-detail-stat strong{font-size:9px}.t-portrait{top:10px}.t-detail-sigil{display:none}}

/* ------------------------------------------------ battle FX: skill cut-in, phase banner
   The cut-in sits below the arena (the grid is framed in the upper part of the screen). */
.t-cutin {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 40;
  animation: cutin-life 1.25s ease forwards;
}
.t-cutin-band {
  position: absolute;
  left: -10%;
  right: -10%;
  top: 60%;
  height: 118px;
  transform: skewY(-4deg);
  background:
    linear-gradient(90deg, transparent, color-mix(in srgb, var(--cutin) 22%, color-mix(in srgb, var(--ink), black 40%)) 18%, color-mix(in srgb, color-mix(in srgb, var(--ink), black 40%) 93%, transparent) 50%, color-mix(in srgb, var(--cutin) 22%, color-mix(in srgb, var(--ink), black 40%)) 82%, transparent),
    repeating-linear-gradient(90deg, transparent 0 38px, color-mix(in srgb, var(--cutin) 18%, transparent) 38px 40px);
  border-top: 2px solid var(--cutin);
  border-bottom: 2px solid var(--cutin);
  box-shadow: 0 0 40px color-mix(in srgb, var(--cutin) 45%, transparent);
  animation: cutin-band 0.32s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
.t-cutin-portrait {
  position: absolute;
  left: 10%;
  top: calc(60% - 70px);
  width: 230px;
  height: 230px;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 25%, #000 70%, transparent), linear-gradient(0deg, transparent, #000 30%);
  -webkit-mask-composite: source-in;
  mask-image: linear-gradient(90deg, transparent, #000 25%, #000 70%, transparent);
  filter: drop-shadow(0 0 18px var(--cutin));
  animation: cutin-portrait 1.25s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
.t-cutin-ally .t-cutin-portrait { left: auto; right: 10%; }
.t-cutin-text {
  position: absolute;
  top: calc(60% + 26px);
  left: 0;
  right: 0;
  text-align: center;
  transform: skewY(-4deg);
  animation: cutin-text 1.25s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
.t-cutin-text small {
  display: block;
  font-size: 11px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--cutin);
}
.t-cutin-text strong {
  font-family: var(--rpg-ui-font-display);
  font-size: 36px;
  font-weight: normal;
  letter-spacing: 4px;
  color: color-mix(in srgb, var(--cream), white 45%);
  text-shadow: 0 0 18px var(--cutin), 0 3px 0 #000;
}
@keyframes cutin-life { 0%, 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes cutin-band { from { transform: skewY(-4deg) scaleX(0); } to { transform: skewY(-4deg) scaleX(1); } }
@keyframes cutin-portrait {
  0% { opacity: 0; transform: translateX(-120px); }
  25% { opacity: 1; transform: translateX(0); }
  80% { opacity: 1; transform: translateX(18px); }
  100% { opacity: 0; transform: translateX(60px); }
}
.t-cutin-ally .t-cutin-portrait { animation-name: cutin-portrait-right; }
@keyframes cutin-portrait-right {
  0% { opacity: 0; transform: translateX(120px); }
  25% { opacity: 1; transform: translateX(0); }
  80% { opacity: 1; transform: translateX(-18px); }
  100% { opacity: 0; transform: translateX(-60px); }
}
@keyframes cutin-text {
  0% { opacity: 0; letter-spacing: 30px; }
  30% { opacity: 1; letter-spacing: 4px; }
  100% { opacity: 1; letter-spacing: 6px; }
}
.t-phase-banner { overflow: hidden; animation: banner-sweep-in 1.3s cubic-bezier(0.2, 0.9, 0.2, 1) both; }
.t-phase-banner h2 { text-shadow: 0 0 22px currentColor; }
.t-banner-enemy { color: color-mix(in srgb, var(--t-danger), white 40%); border-color: var(--t-danger); background: linear-gradient(90deg, transparent, color-mix(in srgb, color-mix(in srgb, var(--t-danger), black 80%) 90%, transparent) 20%, color-mix(in srgb, color-mix(in srgb, var(--t-danger), black 80%) 90%, transparent) 80%, transparent) !important; }
.t-banner-ally { color: var(--cream); }
.t-banner-sweep {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 35%, #ffffff55 50%, transparent 65%);
  animation: banner-sweep 1.1s ease-out 0.15s both;
}
@keyframes banner-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes banner-sweep-in {
  0% { opacity: 0; transform: scaleY(0.1); }
  12% { opacity: 1; transform: scaleY(1.15); }
  20% { transform: scaleY(1); }
  85% { opacity: 1; }
  100% { opacity: 0; transform: scaleY(0.9); }
}
.t-reduced .t-cutin-band, .t-reduced .t-cutin-portrait, .t-reduced .t-cutin-text, .t-reduced .t-banner-sweep { animation: none; }
@media (max-width: 850px) {
  .t-cutin-portrait { width: 150px; height: 150px; top: calc(60% - 30px); }
  .t-cutin-text strong { font-size: 28px; }
}

/* Coop */
.t-coop-roster {
  display: grid;
  gap: 4px;
  margin: 14px 0 4px;
  font-size: 13px;
}
.t-coop-roster p {
  margin: 0;
  color: color-mix(in srgb, var(--t-accent), white 50%);
}
.t-coop-roster b {
  color: color-mix(in srgb, var(--t-accent), white 25%);
  font-weight: 600;
  margin-right: 6px;
}
.t-coop-roster i {
  font-style: normal;
  margin-left: 8px;
  color: color-mix(in srgb, var(--t-success), white 30%);
  font-size: 11px;
  letter-spacing: 0.08em;
}
.t-coop-line span {
  color: color-mix(in srgb, var(--t-accent), white 25%) !important;
}
.t-gold-button.waiting {
  filter: saturate(0.4);
  animation: t-waiting 1.6s ease-in-out infinite;
}
@keyframes t-waiting {
  50% {
    opacity: 0.7;
  }
}

/* Spectators */
.t-watch-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
  padding: 5px 6px 5px 12px;
  border: 1px solid color-mix(in srgb, color-mix(in srgb, var(--t-accent), white 25%) 40%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--ink) 85%, transparent);
  color: color-mix(in srgb, var(--t-accent), white 45%);
  font-size: 11px;
  letter-spacing: 0.16em;
}
.t-options {
  align-items: center;
}
.t-options .t-watch-badge button {
  width: auto;
  height: auto;
  border: 1px solid color-mix(in srgb, color-mix(in srgb, var(--t-accent), white 25%) 53%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--ink), white 5%);
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.08em;
  cursor: pointer;
}
.t-watch-badge kbd {
  font-size: 9px;
  opacity: 0.7;
  margin-left: 4px;
}
.t-watchers {
  margin-right: 6px;
  color: color-mix(in srgb, var(--t-accent), white 45%);
  font-size: 12px;
  letter-spacing: 0.1em;
  opacity: 0.85;
}
.t-command-deck.spectating .t-order {
  display: none;
}

/* PvP */
.t-surrender {
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.75;
}
.t-surrender.hidden {
  display: none;
}

/* Action menu next to the unit (after its move) */
.t-unit-menu {
  position: fixed;
  z-index: 30;
  display: grid;
  gap: 3px;
  min-width: 150px;
  padding: 6px;
  pointer-events: auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ink) 95%, transparent), color-mix(in srgb, var(--ink) 95%, transparent));
  box-shadow: 0 10px 30px #000a;
  transform: translateY(-50%);
  animation: t-menu-in 0.14s ease-out;
}
@keyframes t-menu-in {
  from {
    opacity: 0;
    transform: translate(-6px, -50%);
  }
}
.t-unit-menu .t-menu-item {
  display: grid;
  grid-template-columns: 18px 18px 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--cream);
  font: 14px var(--rpg-ui-font-display);
  text-align: left;
  cursor: pointer;
}
.t-unit-menu .t-menu-item kbd {
  font-size: 9px;
  opacity: 0.55;
}
.t-unit-menu .t-menu-item span {
  color: var(--gold);
}
.t-unit-menu .t-menu-item i {
  font-style: normal;
  font-size: 11px;
  color: color-mix(in srgb, var(--t-accent), white 45%);
}
.t-unit-menu .t-menu-item:hover,
.t-unit-menu .t-menu-item.focused {
  border-color: color-mix(in srgb, var(--gold) 40%, transparent);
  background: color-mix(in srgb, var(--gold) 12%, transparent);
}
.t-unit-menu .t-menu-item.off {
  opacity: 0.35;
  cursor: default;
}
.t-unit-menu small {
  padding: 2px 9px 0;
  font-size: 10px;
  color: color-mix(in srgb, var(--muted), white 10%);
}

/* Danger zone and speed toggles */
.t-options .t-danger.on {
  border-color: color-mix(in srgb, var(--t-danger), black 10%);
  color: color-mix(in srgb, var(--t-danger), white 20%);
  background: color-mix(in srgb, color-mix(in srgb, var(--t-danger), black 10%) 13%, transparent);
}
.t-options .t-speed {
  width: auto;
  min-width: 32px;
  padding: 0 8px;
  border-radius: 16px;
  font: 12px var(--rpg-ui-font-display);
}
`;
