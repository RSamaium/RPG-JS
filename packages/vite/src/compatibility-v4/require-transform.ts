import * as parser from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import { importDeclaration, importDefaultSpecifier, identifier, stringLiteral } from "@babel/types";
import type { Plugin } from "vite";

const traverse = (_traverse as any).default ?? _traverse;
const generate = (_generate as any).default ?? _generate;

function readStaticRequireArg(arg: any, ast: any): string {
  if (!arg) return "";
  if (arg.type === "StringLiteral") return arg.value;
  if (arg.type === "Identifier") {
    let value = "";
    traverse(ast, {
      VariableDeclarator(path: any) {
        if (path.node.id?.name === arg.name && path.node.init?.type === "StringLiteral") {
          value = path.node.init.value;
        }
      },
    });
    return value;
  }
  if (arg.type === "BinaryExpression" && arg.operator === "+") {
    const left = readStaticRequireArg(arg.left, ast);
    const right = readStaticRequireArg(arg.right, ast);
    return left && right ? left + right : "";
  }
  return "";
}

export default function vitePluginRequire(): Plugin {
  return {
    name: "rpgjs-v4-require-transform",
    transform(code, id) {
      const fileRegex = /(.jsx?|.tsx?)(\?.*)?$/;
      const allowRegex = /^(?!.*node_modules(?:\/|\\)(?!rpgjs-|@rpgjs)).*$/;
      if (!fileRegex.test(id) || !allowRegex.test(id)) {
        return { code, map: null };
      }

      const ast = parser.parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx", "decorators-legacy", "classProperties"],
      });

      let changed = false;
      traverse(ast, {
        CallExpression(path: any) {
          if (!path.node.callee || path.node.callee.type !== "Identifier" || path.node.callee.name !== "require") return;

          const request = readStaticRequireArg(path.node.arguments[0], ast);
          if (!request) return;

          const variableName = `__rpgjs_v4_require_${path.scope.generateUidIdentifier("asset").name}`;
          ast.program.body.unshift(importDeclaration([importDefaultSpecifier(identifier(variableName))], stringLiteral(request)));
          path.replaceWith(identifier(variableName));
          changed = true;
        },
      });

      if (!changed) return { code, map: null };
      return { code: generate(ast, {}).code, map: null };
    },
  };
}

