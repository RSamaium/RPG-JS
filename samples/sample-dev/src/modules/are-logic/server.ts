import { defineModule } from "@rpgjs/common";
import { RpgPlayer, RpgServer, RpgMap } from "@rpgjs/server";
import { updateHeuristics, H } from "../../server/arelogic/heuristic.engine";
import { handleAction } from "../../server/hooks/playerActions";
import { mapActionToE } from "../../server/arelogic/event.mapper";
import { logEvent } from "../../server/persistence/event.log";
import { civTick } from "../../server/civ/civ.engine";
import {
  generateLore,
  generateQuest,
  Quest,
} from "../../server/narrative/narrative.engine";
import { loadWorld } from "../../server/persistence/world.store";
import { npcDialog } from "../../server/civ/npc.ai";
import { combatOutcome } from "../../server/systems/combat.system";
import { craftItem } from "../../server/systems/crafting.system";
import {
  executeTrade,
  calculatePrice,
} from "../../server/systems/trading.system";
import { getAllDungeons } from "../../server/systems/dungeon.system";
import {
  getAllFactions,
  claimTerritory,
  updateFactionPower,
} from "../../server/systems/faction.system";
import {
  updateReputation,
  getReputation,
  getReputationLevel,
} from "../../server/systems/reputation.system";
import { interpretHeuristics } from "../../server/narrative/oracle.engine";
import { updateWorldState } from "../../server/systems/environment.system";
import {
  trackAlignment,
  getHeuristicSignature,
  getPlayerSkills,
} from "../../server/systems/skill.system";
import { getStructuresInChunk } from "../../server/systems/structure.system";
import { getChunk } from "../../server/world/chunk.system";

const connectedPlayers = new Map<string, RpgPlayer>();

function handleQuestProgress(
  player: RpgPlayer,
  type: string,
  count: number = 1
) {
  try {
    const quest: Quest = player.getVariable("ACTIVE_QUEST");
    if (!quest || quest.targetType !== type || quest.completed) return;

    quest.currentCount += count;
    if (quest.currentCount >= quest.targetCount) {
      quest.completed = true;
      player.gold += quest.reward;

      if (quest.worldImpact) {
        updateHeuristics(quest.worldImpact);
      }

      try {
        player.gui("AreLogicChat").update({
          message: {
            sender: "System",
            text: `Quest Completed: ${quest.title}! Reward: ${quest.reward} Gold`,
            type: "system",
          },
        });
      } catch {}

      if (quest.nextQuestId) {
        const nextIndex = (quest.chainIndex || 0) + 1;
        setTimeout(
          () =>
            player.setVariable(
              "ACTIVE_QUEST",
              generateQuest(quest.nextQuestId, nextIndex)
            ),
          5000
        );
      } else {
        setTimeout(
          () => player.setVariable("ACTIVE_QUEST", generateQuest()),
          5000
        );
      }
    }
    player.setVariable("ACTIVE_QUEST", quest);
  } catch (err) {
    console.error("[ARE-Logic] Quest progress error:", err);
  }
}

function safeGuiUpdate(player: RpgPlayer, guiId: string, data: any) {
  try {
    player.gui(guiId).update(data);
  } catch {
    // GUI may not be open or registered
  }
}

function safeGuiShow(player: RpgPlayer, guiId: string) {
  try {
    player.gui(guiId).open();
  } catch {
    // GUI may not be registered
  }
}

export default defineModule<RpgServer>({
  player: {
    onConnected(player: RpgPlayer) {
      connectedPlayers.set(player.id, player);
      console.log("[ARE-Logic] Player connected:", player.id);
    },
    onJoinMap(player: RpgPlayer, map: RpgMap) {
      // Open ARE-logic GUI overlays
      safeGuiShow(player, "AreLogicHud");
      safeGuiShow(player, "AreLogicChat");
      safeGuiShow(player, "QuestJournal");
      safeGuiShow(player, "WeatherOverlay");

      // Assign initial quest
      if (!player.getVariable("ACTIVE_QUEST")) {
        player.setVariable("ACTIVE_QUEST", generateQuest());
      }

      // Assign initial faction
      if (!player.getVariable("FACTION")) {
        const factions = ["order", "chaos", "trade"];
        const factionId = factions[Math.floor(Math.random() * factions.length)];
        player.setVariable("FACTION", factionId);
        safeGuiUpdate(player, "AreLogicChat", {
          message: {
            sender: "System",
            text: `You have joined the ${factionId.toUpperCase()} faction!`,
            type: "system",
          },
        });
      }

      // Chat handler
      player.on("player.chat", (text: string) => {
        const currentMap = player.getCurrentMap();
        if (!currentMap) return;
        currentMap.getPlayers().forEach((p: RpgPlayer) => {
          safeGuiUpdate(p, "AreLogicChat", {
            message: {
              sender: player.name?.() || "Player",
              text,
              type: "player",
            },
          });
        });
      });

      // Trading handler
      player.on("player.trade", ({ itemId, type }: any) => {
        const item = {
          id: itemId,
          baseValue: itemId === "wood" ? 5 : itemId === "iron" ? 15 : 50,
        };
        const result = executeTrade(
          player as any,
          item,
          type === "buy",
          "village_merchant"
        );
        if (result.success) {
          if (type === "buy" && player.gold >= result.price) {
            player.gold -= result.price;
            handleQuestProgress(player, "trade");
          } else if (type === "sell") {
            player.gold += result.price;
          }
          updateHeuristics(result.E);
          trackAlignment(player.id, result.E);

          const factionId = player.getVariable("FACTION");
          if (factionId) {
            updateFactionPower(factionId, type === "buy" ? 1 : 2);
            const px = typeof player.x === "function" ? player.x() : 0;
            const py = typeof player.y === "function" ? player.y() : 0;
            const chunkId = `${Math.floor(px / 512)}_${Math.floor(py / 512)}`;
            claimTerritory(factionId, chunkId);
          }
          updateReputation(player.id, "village_merchant", 2, "trade");
        }
      });

      player.on("player.trade.close", () => {
        player.setVariable("TRADING_OPEN", false);
      });

      player.on("player.oracle.close", () => {
        player.setVariable("ORACLE_OPEN", false);
      });
    },
    onInput(player: RpgPlayer, { action, input }: any) {
      if (input && ["up", "down", "left", "right"].includes(input)) {
        handleQuestProgress(player, "move");
      }

      if (!action) return;

      const validatedAction = handleAction({
        type: action,
        playerId: player.id,
      });
      if (!validatedAction) return;

      logEvent(validatedAction);
      let E = mapActionToE(action);

      if (action === "harvest") {
        handleQuestProgress(player, "wood");
      } else {
        handleQuestProgress(player, action);
      }

      if (action === "combat") {
        const result = combatOutcome(player as any, {});
        E = result.E;
        safeGuiUpdate(player, "AreLogicChat", {
          message: {
            sender: "System",
            text: result.win
              ? `You won the battle! Dealt ${result.damage} damage.`
              : "You lost the battle.",
            type: "system",
          },
        });

        safeGuiUpdate(player, "CombatEffects", {
          damage: {
            value: result.damage,
            x: 400 + (Math.random() * 40 - 20),
            y: 300 + (Math.random() * 40 - 20),
            type: result.crit ? "critical" : "normal",
          },
          flash: result.crit ? "crit" : "hit",
        });

        const factionId = player.getVariable("FACTION");
        if (factionId && result.win) {
          updateFactionPower(factionId, 5);
          const px = typeof player.x === "function" ? player.x() : 0;
          const py = typeof player.y === "function" ? player.y() : 0;
          const chunkId = `${Math.floor(px / 512)}_${Math.floor(py / 512)}`;
          claimTerritory(factionId, chunkId);
        }
      }

      if (action === "craft") {
        const result = craftItem(player as any, "potion");
        if (result.success) {
          E = result.E;
          safeGuiUpdate(player, "AreLogicChat", {
            message: {
              sender: "System",
              text: "Successfully crafted a Potion!",
              type: "system",
            },
          });
          handleQuestProgress(player, "craft");
        }
      }

      updateHeuristics(E);
      trackAlignment(player.id, E);
    },
  },
});

// Periodic world tick
setInterval(() => {
  try {
    updateHeuristics(new Array(13).fill(0));
    civTick();
    const env = updateWorldState();

    const lore = generateLore();
    const world = loadWorld();
    const factions = getAllFactions();
    const prophecies = interpretHeuristics();

    connectedPlayers.forEach((player) => {
      try {
        const px = typeof player.x === "function" ? player.x() : 0;
        const py = typeof player.y === "function" ? player.y() : 0;
        const chunkX = Math.floor(px / 512);
        const chunkY = Math.floor(py / 512);

        getChunk(chunkX, chunkY)
          .then((currentChunk) => {
            safeGuiUpdate(player, "AreLogicHud", {
              heuristics: H,
              lore,
              biome: currentChunk?.biome || "plains",
              quest: player.getVariable("ACTIVE_QUEST"),
              skills: getPlayerSkills(player.id),
              signature: getHeuristicSignature(player.id),
              structures: getStructuresInChunk(`${chunkX}_${chunkY}`),
            });
          })
          .catch(() => {});

        safeGuiUpdate(player, "WeatherOverlay", {
          time: env.time,
          weather: env.weather,
          day: env.day,
        });

        const quest = player.getVariable("ACTIVE_QUEST");
        if (quest) {
          safeGuiUpdate(player, "QuestJournal", { quest });
        }

        if (player.getVariable("ORACLE_OPEN")) {
          safeGuiUpdate(player, "OracleGui", { prophecies });
        }

        if (player.getVariable("TRADING_OPEN")) {
          const items = [
            { id: "wood", name: "Wood", baseValue: 5 },
            { id: "iron", name: "Iron", baseValue: 15 },
            { id: "potion", name: "Potion", baseValue: 50 },
          ].map((i) => ({
            ...i,
            price: calculatePrice(i, player.id, "village_merchant"),
          }));
          const rep = getReputation(player.id, "village_merchant");
          safeGuiUpdate(player, "TradingGui", {
            items,
            gold: player.gold,
            reputation: {
              score: rep.score,
              level: getReputationLevel(rep.score),
            },
          });
        }
      } catch (err) {
        // Player may have disconnected
      }
    });

    // Random NPC chat
    if (Math.random() > 0.9 && connectedPlayers.size > 0) {
      const players = Array.from(connectedPlayers.values());
      const target = players[Math.floor(Math.random() * players.length)];
      const msg = npcDialog(
        {},
        target.id,
        target.getVariable("FACTION")
      );
      players.forEach((p) => {
        safeGuiUpdate(p, "AreLogicChat", {
          message: { sender: "Villager", text: msg, type: "npc" },
        });
      });
    }

    // Dungeon notifications
    const dungeons = getAllDungeons();
    dungeons.forEach((d) => {
      if (!d.cleared) {
        connectedPlayers.forEach((p) => {
          if (!p.getVariable("NOTIFIED_" + d.id)) {
            p.setVariable("NOTIFIED_" + d.id, true);
            safeGuiUpdate(p, "AreLogicChat", {
              message: {
                sender: "System",
                text: `A civilization has fallen! ${d.name} has appeared.`,
                type: "system",
              },
            });
          }
        });
      }
    });
  } catch (err) {
    console.error("[ARE-Logic] World tick error:", err);
  }
}, 2000);
