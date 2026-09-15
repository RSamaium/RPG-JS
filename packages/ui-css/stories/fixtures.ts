// Presentation fixtures only: gameplay actions and authority remain in RPGJS.
// Labels here are sample content, not runtime translation defaults.
const sanctuaryArt = new URL(
  "./assets/celestial-sanctuary.webp",
  import.meta.url
).href;
const swordArt = new URL("./assets/celestial-sword.webp", import.meta.url).href;
export const lunaPortrait = new URL(
  "./assets/celestial-luna.webp",
  import.meta.url
).href;
export function itemArt(kind = "sword") {
  return kind === "sword"
    ? '<img class="catalog-item-art" src="' +
        swordArt +
        '" alt="" width="128" height="128">'
    : icon(kind);
}
export const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        char
      ]!)
  );
export function icon(kind = "crystal") {
  const paths: Record<string, string> = {
    crystal:
      '<path fill="#407f9b" stroke="#b0edf2" d="M16 2 26 14 16 30 6 14Z"/><path fill="#a6edf3" stroke="none" d="m16 2 3 12-3 16-3-16Z"/><path stroke="#defbff" d="M6 14h20"/>',
    sword:
      '<path fill="#7095a2" stroke="#d8e9e3" d="m22 3 7 0 0 7-16 16-7-7Z"/><path fill="#e8f7ef" stroke="none" d="M28 4 11 23 8 20Z"/><path stroke="#ddb86f" stroke-width="3" d="M4 17l11 11 M3 29l5-5"/><path stroke="#fff0be" d="M4 16l12 12"/>',
    potion:
      '<path fill="#2f6677" stroke="#b9dfdc" d="M13 5v6C2 21 6 29 16 29S30 21 19 11V5Z"/><path fill="#e18b9f" stroke="none" d="M9 20h14c3 8-17 8-14 0"/><path stroke="#eed8a0" stroke-width="3" d="M12 4h8"/><path stroke="#e1faf6" d="m12 14-3 5"/>',
    shield:
      '<path fill="#b39b63" stroke="#f0dca6" d="m16 3 11 5-2 14-9 8-9-8L5 8Z"/><path fill="#355467" stroke="#182f3d" d="m16 7 7 3-2 10-5 5-5-5-2-10Z"/><path stroke="#d0e7e4" d="M16 10v11 M12 15h8"/>',
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
          '%"></div></div></div>'
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
        "</button>"
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
  return (
    '<div class="catalog-stage" style="--rpg-ui-scene-art:url(&quot;' +
    sanctuaryArt +
    '&quot;)">' +
    body +
    "</div>"
  );
}
export function menuItems(labels: string[]) {
  return labels
    .map(
      (label, i) =>
        '<button type="button" class="rpg-ui-menu-item" data-selected="' +
        (i === 0) +
        '">' +
        escape(label) +
        "</button>"
    )
    .join("");
}
export function interactive(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  root.addEventListener("click", (event) => {
    const el = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-selected]"
    );
    if (!el || el.matches(':disabled, [aria-disabled="true"]')) return;
    el.parentElement
      ?.querySelectorAll(":scope > [data-selected]")
      .forEach((item) => item.setAttribute("data-selected", "false"));
    el.dataset.selected = "true";
  });
  return root;
}
