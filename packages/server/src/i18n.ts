import { createI18nProvider, type I18nConfig, type I18nMessages } from "@rpgjs/common";

/** Default player-facing messages sent by the server; games override them with `provideI18n()`. */
export const RpgServerBuiltinI18n: I18nMessages = {
  en: {
    "rpg.notification.level-up": "You reached level {level}",
    "rpg.notification.skill-learned": "Learned {name}",
    "rpg.notification.skill-forgotten": "Forgot {name}",
    "rpg.notification.skill-unknown": "Skill",
    "rpg.notification.reward.exp-gold": "You won {exp} experience and {gold} gold",
    "rpg.notification.reward.item": "You won {amount} {name}",
    "rpg.error.generic": "This action is not possible.",
    "rpg.error.save-list-failed": "The saved games could not be loaded.",
    "rpg.error.ITEM_NOT_INVENTORY": "This item is not in your inventory.",
    "rpg.error.NOT_USE_ITEM": "You cannot use this item.",
    "rpg.error.USE_CHANCE_ITEM_FAILED": "The item had no effect.",
    "rpg.error.INVALID_ITEM_TO_EQUIP": "This item is not a weapon or an armor.",
    "rpg.error.CANNOT_EQUIP": "You cannot equip this item.",
    "rpg.error.ITEM_ALREADY_EQUIPED": "This item is already equipped.",
    "rpg.error.RESTRICTION_ITEM": "A state prevents you from using this item.",
  },
  fr: {
    "rpg.notification.level-up": "Vous atteignez le niveau {level}",
    "rpg.notification.skill-learned": "{name} appris",
    "rpg.notification.skill-forgotten": "{name} oublié",
    "rpg.notification.skill-unknown": "Compétence",
    "rpg.notification.reward.exp-gold": "Vous gagnez {exp} points d’expérience et {gold} pièces d’or",
    "rpg.notification.reward.item": "Vous gagnez {amount} {name}",
    "rpg.error.generic": "Cette action est impossible.",
    "rpg.error.save-list-failed": "Les parties sauvegardées n’ont pas pu être chargées.",
    "rpg.error.ITEM_NOT_INVENTORY": "Cet objet n’est pas dans votre inventaire.",
    "rpg.error.NOT_USE_ITEM": "Vous ne pouvez pas utiliser cet objet.",
    "rpg.error.USE_CHANCE_ITEM_FAILED": "L’objet n’a eu aucun effet.",
    "rpg.error.INVALID_ITEM_TO_EQUIP": "Cet objet n’est ni une arme ni une armure.",
    "rpg.error.CANNOT_EQUIP": "Vous ne pouvez pas équiper cet objet.",
    "rpg.error.ITEM_ALREADY_EQUIPED": "Cet objet est déjà équipé.",
    "rpg.error.RESTRICTION_ITEM": "Un état vous empêche d’utiliser cet objet.",
  },
};

export function provideI18n(config: I18nConfig = {}) {
  return createI18nProvider(config);
}
