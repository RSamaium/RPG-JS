/** The script `zone`: it is plain text, run by the interpreter of @rpgjs/script (never as JavaScript). */
export default `
// The first player of the map makes a zone, and walking into it shakes the screen of the players of the map.
on("player.joinMap", () => {
  if ($map.getShape("rumble")) return;
  $map.createShape({ name: "rumble", x: 380, y: 540, width: 200, height: 80, color: "#8855cc" });
});

on("player.inShape", { where: { "shape.name": "rumble" } }, () => {
  $map.shakeMap({ intensity: 12, duration: 500, direction: "both" });
  $player.showNotification("The ground shakes! " + $map.getPlayers().length + " player(s) on " + $map.id);
});
`;
