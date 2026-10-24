/**
 * The only place where the text of a script becomes a tree (with `acorn`). Kept out of the core so that code that only runs
 * trees, such as the game, does not carry the parser. The tree is only ever walked by the interpreter: it is never executed as
 * JavaScript.
 */
import * as acorn from "acorn";
import type { AstNode } from "./core/interpreter";

/** Parses the text of a script. Throws the error of `acorn` (with `loc.line`) when the text is not valid. */
export function parseScript(source: string): AstNode {
  return acorn.parse(source, { ecmaVersion: 2022, sourceType: "module", locations: true }) as unknown as AstNode;
}
