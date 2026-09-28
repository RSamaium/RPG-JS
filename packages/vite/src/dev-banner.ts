import colors from "picocolors";
import { PartyConnection } from "@rpgjs/server/node";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";

export type RpgjsDevServerKind =
  | { kind: "browser" }
  | { kind: "node"; entry: string }
  | { kind: "remote"; entry: string; target: string; mapCount: number };

export interface RpgjsDevBannerInfo {
  version?: string;
  mode: "rpg" | "mmorpg";
  clientEntry: string;
  server: RpgjsDevServerKind;
  /** First local URL printed by Vite, used to show the WebSocket endpoint. */
  localUrl?: string;
  /** Enabled network simulations, already formatted (e.g. `latency 120 ms`). */
  networkSimulation?: string[];
  /** Lines contributed by other RPGJS plugins, such as served map folders. */
  entries?: RpgjsDevBannerEntry[];
}

export interface RpgjsDevBannerEntry {
  label: string;
  value: string;
}

const bannerEntries = new WeakMap<ResolvedConfig, RpgjsDevBannerEntry[]>();

/**
 * Add a line to the RPGJS section printed under the Vite URLs when the dev
 * server starts. Plugins call it from `configureServer`.
 */
export function addDevBannerEntry(config: ResolvedConfig, entry: RpgjsDevBannerEntry): void {
  const entries = bannerEntries.get(config) ?? [];
  if (!entries.some((existing) => existing.label === entry.label && existing.value === entry.value)) {
    entries.push(entry);
  }
  bannerEntries.set(config, entries);
}

declare const __RPGJS_VERSION__: string | undefined;

function readPackageVersion(): string | undefined {
  return typeof __RPGJS_VERSION__ === "string" ? __RPGJS_VERSION__ : undefined;
}

function readNetworkSimulation(): string[] {
  const simulations: string[] = [];
  const withFilter = (text: string, filter: string) => (filter ? `${text} (${filter})` : text);
  const latency = PartyConnection.getLatencyStatus();
  if (latency.enabled) simulations.push(withFilter(`latency ${latency.ms} ms`, latency.filter));
  const packetLoss = PartyConnection.getPacketLossStatus();
  if (packetLoss.enabled) {
    simulations.push(withFilter(`packet loss ${(packetLoss.rate * 100).toFixed(1)}%`, packetLoss.filter));
  }
  const bandwidth = PartyConnection.getBandwidthStatus();
  if (bandwidth.enabled) simulations.push(withFilter(`bandwidth ${bandwidth.kbps} kbps`, bandwidth.filter));
  return simulations;
}

function toWebSocketUrl(localUrl: string): string {
  const url = new URL("parties", localUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/**
 * Format the RPGJS section printed after the Vite URLs. It mirrors Vite's own
 * layout (two-space indent, `➜` bullets) so both blocks read as one.
 */
export function formatRpgjsBanner(info: RpgjsDevBannerInfo): string {
  const version = info.version ? colors.dim(`v${info.version}`) : "";
  const badge =
    info.mode === "mmorpg"
      ? colors.bgMagenta(colors.black(colors.bold(" MMORPG ")))
      : colors.bgCyan(colors.black(colors.bold(" RPG ")));
  const title = [colors.magenta(colors.bold("RPGJS")), version, badge].filter(Boolean).join(" ");

  const rows: [string, string][] = [];
  const arrow = colors.dim("→");

  if (info.server.kind === "browser") {
    rows.push(["Game", colors.cyan(info.clientEntry)]);
    rows.push(["Server", colors.dim("runs in the browser (standalone)")]);
  } else {
    rows.push(["Client", colors.cyan(info.clientEntry)]);
    if (info.server.kind === "node") {
      const endpoint = info.localUrl ? ` ${arrow} ${colors.cyan(toWebSocketUrl(info.localUrl))}` : "";
      rows.push(["Server", `${colors.cyan(info.server.entry)}${endpoint}`]);
    } else {
      const maps = info.server.mapCount === 1 ? "1 map" : `${info.server.mapCount} maps`;
      rows.push([
        "Server",
        `${colors.cyan(info.server.target)} ${colors.dim(`(remote, publishing ${maps})`)}`,
      ]);
    }
  }

  for (const entry of info.entries ?? []) {
    rows.push([entry.label, entry.value]);
  }

  if (info.server.kind === "node" && info.networkSimulation?.length) {
    rows.push(["Network", colors.yellow(`simulated ${info.networkSimulation.join(", ")}`)]);
  }

  const labelWidth = Math.max(...rows.map(([label]) => label.length)) + 1;
  const lines = rows.map(
    ([label, value]) => `  ${colors.magenta("➜")}  ${colors.bold(`${label}:`.padEnd(labelWidth + 1))} ${value}`,
  );

  return ["", `  ${title}`, "", ...lines].join("\n");
}

export interface RpgjsDevBannerPluginOptions {
  rpgType: string;
  clientEntry: string;
  serverEntry: string;
  remoteTarget?: string;
  remoteMapIds?: string[];
}

/**
 * Print the RPGJS section (mode, entries, server endpoint, served folders,
 * network simulation) right after the URLs Vite prints on startup.
 */
export function devBannerPlugin(options: RpgjsDevBannerPluginOptions): Plugin {
  return {
    name: "rpgjs:dev-banner",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        const mode = options.rpgType === "mmorpg" ? "mmorpg" : "rpg";
        const serverKind: RpgjsDevServerKind =
          mode === "rpg"
            ? { kind: "browser" }
            : options.remoteTarget
              ? {
                  kind: "remote",
                  entry: options.serverEntry,
                  target: options.remoteTarget,
                  mapCount: options.remoteMapIds?.length ?? 0,
                }
              : { kind: "node", entry: options.serverEntry };

        server.config.logger.info(
          formatRpgjsBanner({
            version: readPackageVersion(),
            mode,
            clientEntry: options.clientEntry,
            server: serverKind,
            localUrl: server.resolvedUrls?.local[0],
            networkSimulation: serverKind.kind === "node" ? readNetworkSimulation() : [],
            entries: bannerEntries.get(server.config),
          }),
        );
      };
    },
  };
}
