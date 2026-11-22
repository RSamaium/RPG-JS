/**
 * The only host globals the server adapter uses that the ES2022 library does not declare. Node, browsers and Cloudflare Workers
 * all have them. The core, the game API and the parser stay checked against ES2022 alone: they use no host API.
 */
declare function setTimeout(handler: () => void, milliseconds?: number): unknown;
declare function clearTimeout(timer: unknown): void;
/** The transport of `$http` is told when the script stops waiting. */
declare interface AbortSignal { readonly aborted: boolean; addEventListener(type: "abort", listener: () => void): void }
declare class AbortController { readonly signal: AbortSignal; abort(): void }
declare const console: { error(...data: unknown[]): void; warn(...data: unknown[]): void; log(...data: unknown[]): void };
