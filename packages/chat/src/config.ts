export const CHAT_GUI_ID = "rpg-chat";
export const CHAT_SEND_EVENT = "chat:send";
export const CHAT_MESSAGE_EVENT = "chat:message";
export const CHAT_ERROR_EVENT = "chat:error";
/** A moderation tool removed a message: the clients drop it. Payload: `{ id }`. */
export const CHAT_DELETE_EVENT = "chat:delete";

export const positiveInteger = (
  value: number | undefined,
  fallback: number,
): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value as number));
};
