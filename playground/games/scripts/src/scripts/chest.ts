/** The script `chest`: it is plain text, run by the interpreter of @rpgjs/script (never as JavaScript). */
export default `
// A chest gives gold once. A variable of the player, named after the event, remembers that it was opened.
on("event.action", { where: { "event.name": "chest" } }, () => {
  if ($player.getVariable($event.id + "_opened")) {
    $player.showText("The chest is empty.");
    return;
  }
  $player.setVariable($event.id + "_opened", true);
  $player.gold += 25;
  $player.showNotification("You found 25 gold. Gold: " + $player.gold);
});
`;
