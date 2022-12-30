"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsPathTransform = void 0;
const ts = require("typescript");
const path_1 = require("path");
/**
 * Rewrite relative import to absolute import or trigger
 */
function rewritePath(importPath, sourceFile, opts, regexps) {
    const aliases = Object.keys(regexps);
    for (const alias of aliases) {
        const regex = regexps[alias];
        if (regexps[alias].test(importPath)) {
            return importPath.replace(regex, opts.alias[alias]);
        }
    }
    if (typeof opts.rewrite === 'function') {
        const newImportPath = opts.rewrite(importPath, sourceFile.fileName);
        if (newImportPath) {
            return newImportPath;
        }
    }
    if (opts.project && opts.projectBaseDir && importPath.startsWith('.')) {
        const path = (0, path_1.resolve)((0, path_1.dirname)(sourceFile.fileName), importPath).split(opts.projectBaseDir)[1];
        return `${opts.project}${path}`;
    }
    return importPath;
}
function isDynamicImport(node) {
    return ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
}
function importExportVisitor(ctx, sourceFile, opts = { projectBaseDir: '' }, regexps) {
    const visitor = (node) => {
        let importPath;
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
            const importPathWithQuotes = node.moduleSpecifier.getText(sourceFile);
            importPath = importPathWithQuotes.slice(1, importPathWithQuotes.length - 1);
        }
        else if (isDynamicImport(node)) {
            const importPathWithQuotes = node.arguments[0].getText(sourceFile);
            importPath = importPathWithQuotes.slice(1, importPathWithQuotes.length - 1);
        }
        else if (ts.isImportTypeNode(node) &&
            ts.isLiteralTypeNode(node.argument) &&
            ts.isStringLiteral(node.argument.literal)) {
            // `.text` instead of `getText` bc this node doesn't map to sf (it's generated d.ts)
            importPath = node.argument.literal.text;
        }
        if (importPath) {
            const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);
            // Only rewrite relative path.
            if (rewrittenPath !== importPath) {
                if (ts.isImportDeclaration(node)) {
                    return ctx.factory.updateImportDeclaration(node, ts.getModifiers(node), node.importClause, ctx.factory.createStringLiteral(rewrittenPath), node.assertClause);
                }
                else if (ts.isExportDeclaration(node)) {
                    return ctx.factory.updateExportDeclaration(node, ts.getModifiers(node), node.isTypeOnly, node.exportClause, ctx.factory.createStringLiteral(rewrittenPath), node.assertClause);
                }
                else if (isDynamicImport(node)) {
                    return ctx.factory.updateCallExpression(node, node.expression, node.typeArguments, ctx.factory.createNodeArray([
                        ctx.factory.createStringLiteral(rewrittenPath),
                    ]));
                }
                else if (ts.isImportTypeNode(node)) {
                    return ctx.factory.updateImportTypeNode(node, ctx.factory.createLiteralTypeNode(ctx.factory.createStringLiteral(rewrittenPath)), node.assertions, node.qualifier, node.typeArguments, node.isTypeOf);
                }
            }
            return node;
        }
        return ts.visitEachChild(node, visitor, ctx);
    };
    return visitor;
}
/**
 * AST Transformer to rewrite any ImportDeclaration paths.
 * This is typically used to rewrite relative imports into absolute imports
 * and mitigate import path differences w/ metaserver
 */
function tsPathTransform(opts) {
    const { alias = {} } = opts;
    const regexps = Object.keys(alias).reduce((all, regexString) => {
        all[regexString] = new RegExp(regexString, 'gi');
        return all;
    }, {});
    const transformFactory = (ctx) => {
        const transformSourceFile = (node) => {
            return ts.visitNode(node, importExportVisitor(ctx, node, opts, regexps));
        };
        const transformBundle = (node) => {
            return ts.visitEachChild(node, (node) => {
                if (ts.isSourceFile(node)) {
                    return ts.visitNode(node, importExportVisitor(ctx, node, opts, regexps));
                }
                return node;
            }, ctx);
        };
        return {
            transformSourceFile,
            transformBundle,
        };
    };
    return transformFactory;
}
exports.tsPathTransform = tsPathTransform;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImltcG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHOzs7QUFFaEcsaUNBQWlDO0FBQ2pDLCtCQUF3QztBQWdCeEM7O0dBRUc7QUFDSCxTQUFTLFdBQVcsQ0FBQyxVQUFrQixFQUFFLFVBQXlCLEVBQUUsSUFBMEIsRUFBRSxPQUErQjtJQUM5SCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFO1FBQzVCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QixJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDcEMsT0FBTyxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDckQ7S0FDRDtJQUVELElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRTtRQUN2QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEUsSUFBSSxhQUFhLEVBQUU7WUFDbEIsT0FBTyxhQUFhLENBQUM7U0FDckI7S0FDRDtJQUVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDdEUsTUFBTSxJQUFJLEdBQUcsSUFBQSxjQUFPLEVBQUMsSUFBQSxjQUFPLEVBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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