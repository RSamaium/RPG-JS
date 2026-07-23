import { Context } from "@signe/di";
import type { RpgContext } from "@rpgjs/common";

const signeContext = new Context();
signeContext['side'] = 'server'
export const context = signeContext as unknown as RpgContext;
