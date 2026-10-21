/** The script `shop`: it is plain text, run by the interpreter of @rpgjs/script (never as JavaScript). */
export default `
// A potion costs 10 gold. The stock is shared by all the players of the map: take() tests and decreases it in one step,
// so two players cannot both buy the last potion.
shared({ stock: { initial: 3, client: true } });

on("event.action", { where: { "event.name": "shop" } }, () => {
  if ($player.gold < 10) {
    say("A potion costs 10 gold.");
    return;
  }
  if (!$shared.take("stock", 1)) {
    say("Sold out!");
    return;
  }
  $player.gold -= 10;
  $player.addItem("Potion", 1);
  notify("Bought a potion. Gold: " + $player.gold + ", left in stock: " + $shared.stock);
});
`;
