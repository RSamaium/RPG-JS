import { Context, inject, provide } from "@signe/di";
import type { RpgContext, RpgFactoryProvider } from "./foundation";

export type I18nLocaleMessages = Record<string, string>;
export type I18nMessages = Record<string, I18nLocaleMessages>;
export type I18nParams = Record<string, unknown>;

export interface I18nConfig {
  defaultLocale?: string;
  fallbackLocale?: string;
  messages?: I18nMessages;
}

type I18nLayer = {
  source: string;
  priority: number;
  messages: I18nMessages;
  order: number;
};

type PendingI18nLayer = Omit<I18nLayer, "order">;

export const I18nServiceToken = "I18nServiceToken";
const PendingI18nLayersKey = "__rpgjs_pending_i18n_layers__";

let layerOrder = 0;

function normalizeMessages(messages?: I18nMessages): I18nMessages {
  if (!messages) return {};
  const normalized: I18nMessages = {};
  for (const locale in messages) {
    const catalog = messages[locale];
    if (!catalog || typeof catalog !== "object") continue;
    normalized[locale] = { ...catalog };
  }
  return normalized;
}

function hasMessages(messages?: I18nMessages): messages is I18nMessages {
  if (!messages) return false;
  return Object.values(messages).some((catalog) => catalog && Object.keys(catalog).length > 0);
}

function interpolate(message: string, params: I18nParams = {}): string {
  return message.replace(/\{([^{}]+)\}/g, (match, key) => {
    const name = String(key).trim();
    if (!Object.prototype.hasOwnProperty.call(params, name)) return match;
    const value = params[name];
    return value == null ? "" : String(value);
  });
}

function getPendingLayers(context: Context): PendingI18nLayer[] {
  const values = context as unknown as Record<string, any>;
  values[PendingI18nLayersKey] ||= [];
  return values[PendingI18nLayersKey];
}

export class I18nService {
  defaultLocale: string;
  fallbackLocale: string;
  private layers: I18nLayer[] = [];

  constructor(config: I18nConfig = {}) {
    this.defaultLocale = config.defaultLocale || "en";
    this.fallbackLocale = config.fallbackLocale || this.defaultLocale;
    this.addMessages(config.messages, "game", 20);
  }

  configure(config: I18nConfig = {}) {
    if (config.defaultLocale) this.defaultLocale = config.defaultLocale;
    if (config.fallbackLocale) this.fallbackLocale = config.fallbackLocale;
    if (config.messages) this.addMessages(config.messages, "game", 20);
  }

  addMessages(messages?: I18nMessages, source = "module", priority = 10) {
    if (!hasMessages(messages)) return;
    this.layers.push({
      source,
      priority,
      messages: normalizeMessages(messages),
      order: layerOrder++,
    });
  }

  hasLocale(locale: string): boolean {
    return this.layers.some((layer) => !!layer.messages[locale]);
  }

  translate(key: string, params: I18nParams = {}, locale = this.defaultLocale): string {
    const translated = this.resolve(key, locale) ?? this.resolve(key, this.fallbackLocale) ?? key;
    return interpolate(translated, params);
  }

  t(key: string, params?: I18nParams, locale?: string): string {
    return this.translate(key, params, locale);
  }

  private resolve(key: string, locale: string): string | undefined {
    const layers = [...this.layers].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.order - a.order;
    });
    for (const layer of layers) {
      const value = layer.messages[locale]?.[key];
      if (typeof value === "string") return value;
    }
    return undefined;
  }
}

export function getOrCreateI18nService(context?: RpgContext | null, config?: I18nConfig): I18nService {
  if (!context) {
    return new I18nService(config);
  }
  const signeContext = context as Context;
  let service = inject<I18nService>(signeContext, I18nServiceToken, { optional: true });
  if (!service) {
    service = new I18nService();
    for (const layer of getPendingLayers(signeContext)) {
      service.addMessages(layer.messages, layer.source, layer.priority);
    }
    provide(signeContext, I18nServiceToken, service);
  }
  if (config) service.configure(config);
  return service;
}

export function registerI18nMessages(
  context: RpgContext,
  messages: I18nMessages | undefined,
  source = "module",
  priority = 10
) {
  if (!hasMessages(messages)) return;
  const signeContext = context as Context;
  const service = inject<I18nService>(signeContext, I18nServiceToken, { optional: true });
  if (service) {
    service.addMessages(messages, source, priority);
    return;
  }
  getPendingLayers(signeContext).push({
    source,
    priority,
    messages: normalizeMessages(messages),
  });
}

export function createI18nProvider(config: I18nConfig = {}): RpgFactoryProvider<I18nService> {
  return {
    provide: I18nServiceToken,
    useFactory: (context: RpgContext) => getOrCreateI18nService(context, config),
  };
}
