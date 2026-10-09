import { Plugin } from 'vite';
import MagicString from 'magic-string';
import { parse } from 'acorn';
import * as walk from 'acorn-walk';

export interface RemoveImportsPluginOptions {
    /**
     * Array of patterns to match against import sources
     * Can be strings (exact match) or RegExp objects
     */
    patterns: (string | RegExp)[];
}

/**
 * Replaces a node in the source code using MagicString
 * @param s - MagicString instance
 * @param start - Start position of the node
 * @param end - End position of the node
 * @param replacement - The replacement string
 */
function replaceNode(s: MagicString, start: number, end: number, replacement: string) {
    s.overwrite(start, end, replacement);
}

/**
 * Checks if an import source matches any of the provided patterns
 * @param source - The import source string
 * @param patterns - Array of string or RegExp patterns
 * @returns True if the source matches any pattern
 * 
 * @example
 * ```typescript
 * matchesPattern('react', ['react', /^@types/]) // true
 * matchesPattern('@types/node', ['react', /^@types/]) // true
 * matchesPattern('lodash', ['react', /^@types/]) // false
 * ```
 */
function matchesPattern(source: string, patterns: (string | RegExp)[]): boolean {
    return patterns.some(pattern => {
        if (typeof pattern === 'string') {
            return source === pattern;
        } else if (pattern instanceof RegExp) {
            return pattern.test(source);
        }
        return false;
    });
}

/**
 * Generates const declarations from import specifiers
 * @param node - The import declaration node
 * @returns String with const declarations set to null
 * 
 * @example
 * ```typescript
 * // import React, { useState, useEffect } from 'react'
 * // becomes: const React = null; const useState = null; const useEffect = null;
 * 
 * // import * as utils from 'utils'
 * // becomes: const utils = null;
 * 
 * // import 'side-effect-module'
 * // becomes: // removed import: side-effect-module
 * ```
 */
function generateConstDeclarations(node: any): string {
    const declarations: string[] = [];
    
    if (node.specifiers && node.specifiers.length > 0) {
        for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier') {
                // import React from 'react' -> const React = null;
                declarations.push(`const ${specifier.local.name} = null;`);
            } else if (specifier.type === 'ImportSpecifier') {
                // import { useState } from 'react' -> const useState = null;
                declarations.push(`const ${specifier.local.name} = null;`);
            } else if (specifier.type === 'ImportNamespaceSpecifier') {
                // import * as React from 'react' -> const React = null;
                declarations.push(`const ${specifier.local.name} = null;`);
            }
        }
    } else {
        // Side-effect import like import 'module' -> comment
        declarations.push(`// removed import: ${node.source.value}`);
    }
    
    return declarations.join(' ');
}

/**
 * Vite plugin that replaces import statements with const declarations set to null
 * 
 * This plugin analyzes JavaScript/TypeScript files and replaces import statements
 * whose source matches any of the provided patterns with const declarations set to null.
 * This is useful for removing dependencies while maintaining variable declarations.
 * 
 * @param options - Configuration options for the plugin
 * @returns Vite plugin object
 * 
 * @example
 * ```typescript
 * // Replace specific imports
 * removeImportsPlugin({
 *   patterns: ['react', 'vue', '@types/node']
 * })
 * 
 * // Replace imports using regex patterns
 * removeImportsPlugin({
 *   patterns: [/^@types\//, /^react-/, 'lodash']
 * })
 * 
 * // Transform example:
 * // import React, { useState } from 'react';
 * // becomes: const React = null; const useState = null;
 * ```
 */
export function removeImportsPlugin(options: RemoveImportsPluginOptions): Plugin {
    return {
        name: 'rpgjs-remove-imports',
        transform(code, id) {
            // Skip non-JS/TS files
            if (!id.match(/\.(js|ts|jsx|tsx)$/)) {
                return null;
            }

            try {
                const ast = parse(code, { 
                    ecmaVersion: 'latest', 
                    sourceType: 'module' 
                }) as any;
                
                const s = new MagicString(code);
                let hasChanges = false;

                // Walk through the AST to find import declarations
                walk.simple(ast, {
                    ImportDeclaration(node: any) {
                        const importSource = node.source.value;
                        
                        if (matchesPattern(importSource, options.patterns)) {
                            const replacement = generateConstDeclarations(node);
                            replaceNode(s, node.start, node.end, replacement);
                            hasChanges = true;
                        }
                    },
                    ExportNamedDeclaration(node: any) {
                        const exportSource = node.source?.value;
                        if (exportSource && matchesPattern(exportSource, options.patterns)) {
                            replaceNode(s, node.start, node.end, `/* removed export: ${exportSource} */`);
                            hasChanges = true;
                        }
                    },
                    ExportAllDeclaration(node: any) {
                        const exportSource = node.source?.value;
                        if (exportSource && matchesPattern(exportSource, options.patterns)) {
                            replaceNode(s, node.start, node.end, `/* removed export: ${exportSource} */`);
                            hasChanges = true;
                        }
                    }
                });

                // Only return transformed code if changes were made
                if (hasChanges) {
                    return {
                        code: s.toString(),
                        map: s.generateMap({ hires: true })
                    };
                }

                return null;
            } catch (error) {
                // If parsing fails, return the original code
                console.warn(`Failed to parse ${id}:`, error);
                return null;
            }
        }
    };
}
