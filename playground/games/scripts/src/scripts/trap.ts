/** The script `trap`: it is plain text, run by the interpreter of @rpgjs/script (never as JavaScript). */
export default `
// Touching the trap costs 5 gold, when the player has them.
on("event.touch", { where: { "event.name": "trap" }, when: [{ stat: "gold", gte: 5 }] }, () => {
  $player.gold -= 5;
  notify("Ouch! -5 gold. Gold: " + $player.gold);
});
`;
