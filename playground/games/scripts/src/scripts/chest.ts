/** The script `chest`: it is plain text, run by the interpreter of @rpgjs/script (never as JavaScript). */
export default `
// A chest gives gold once: the self switch A remembers that it was opened.
on("event.action", { where: { "event.name": "chest" } }, () => {
  if ($self.A) {
    say("The chest is empty.");
    return;
  }
  $self.A = true;
  $player.gold += 25;
  notify("You found 25 gold. Gold: " + $player.gold);
});
`;
