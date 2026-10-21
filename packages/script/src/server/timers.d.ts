/**
 * The only host global the server adapter uses that the ES2022 library does not declare. Node, browsers and Cloudflare Workers
 * all have it. The core, the game API and the parser stay checked against ES2022 alone: they use no host API.
 */
declare function setTimeout(handler: () => void, milliseconds?: number): unknown;
