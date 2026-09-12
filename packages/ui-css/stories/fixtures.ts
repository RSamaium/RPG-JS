// Presentation fixtures only: gameplay actions and authority remain in RPGJS.
// Labels here are sample content, not runtime translation defaults.
export const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function icon(kind = "crystal") {
  const paths: Record<string, string> = {
    crystal:
      '<path d="M16 2 26 14 16 30 6 14Z"/><path d="m16 2 3 12-3 16-3-16Z M6 14h20"/>',
    sword: '<path d="m22 3 7 0 0 7-16 16-7-7Z M4 17l11 11 M3 29l5-5"/>',
    potion:
      '<path d="M12 3h8 M13 3v8C2 21 6 29 16 29S30 21 19 11V3 M9 20h14"/>',
    shield: '<path d="m16 3 11 5-2 14-9 8-9-8L5 8Z M16 7v18"/>',
  };
  return (
    '<svg class="catalog-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
    (paths[kind] || paths.crystal) +
    "</svg>"
  );
}
export function button(label: string, variant = "secondary", extra = "") {
  return (
    '<button type="button" class="rpg-ui-btn" data-variant="' +
    variant +
    '" ' +
    extra +
    ">" +
    escape(label) +
    "</button>"
  );
}
export function bars() {
  return (
    '<div class="rpg-ui-stack">' +
    [
      ["HP", "health", "76"],
      ["MP", "mana", "58"],
      ["XP", "xp", "42"],
    ]
      .map(
        ([label, type, value]) =>
          '<div><div class="rpg-ui-row"><small>' +
          label +
          " " +
          value +
          ' / 100</small></div><div class="rpg-bar-container" role="progressbar" aria-label="' +
          label +
          '" aria-valuenow="' +
          value +
          '" aria-valuemin="0" aria-valuemax="100"><div class="rpg-bar-fill ' +
          type +
          '" style="width:' +
          value +
          '%"></div></div></div>',
      )
      .join("") +
    "</div>"
  );
}
export function slots(count = 6) {
  return (
    '<div class="rpg-ui-hotbar" style="--rpg-ui-hotbar-slots:' +
    count +
    '"><div class="rpg-ui-hotbar-track">' +
    Array.from(
      { length: count },
      (_, i) =>
        '<button type="button" class="rpg-ui-hotbar-slot" data-selected="' +
        (i === 0) +
        '" data-empty="' +
        (i > 3) +
        '" aria-label="Slot ' +
        (i + 1) +
        '"><span class="rpg-ui-hotbar-key">' +
        (i + 1) +
        "</span>" +
        (i < 4 ? icon(["sword", "crystal", "potion", "shield"][i]) : "") +
        (i === 2 ? '<span class="rpg-ui-hotbar-count">3</span>' : "") +
        "</button>",
    ).join("") +
    "</div></div>"
  );
}
export function panel(title: string, body: string) {
  return (
    '<section class="rpg-ui-panel rpg-ui-stack"><h2>' +
    escape(title) +
    "</h2>" +
    body +
    "</section>"
  );
}
export function scene(body: string) {
  return '<div class="catalog-stage">' + body + "</div>";
}
export function menuItems(labels: string[]) {
  return labels
    .map(
      (label, i) =>
        '<button type="button" class="rpg-ui-menu-item" data-selected="' +
        (i === 0) +
        '">' +
        escape(label) +
        "</button>",
    )
    .join("");
}
export function interactive(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  root.addEventListener("click", (event) => {
    const el = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-selected]",
    );
    if (!el || el.matches(':disabled, [aria-disabled="true"]')) return;
    el.parentElement
      ?.querySelectorAll(":scope > [data-selected]")
      .forEach((item) => item.setAttribute("data-selected", "false"));
    el.dataset.selected = "true";
  });
  return root;
}
