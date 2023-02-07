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
function pluckDeclarationSpecifier(node, sourceFile) {
    const importPathWithQuotes = node.moduleSpecifier.getText(sourceFile);
    return importPathWithQuotes.slice(1, importPathWithQuotes.length - 1);
}
function pluckDynamicImportSpecifier(node, sourceFile) {
    const importPathWithQuotes = node.arguments[0].getText(sourceFile);
    const importPath = importPathWithQuotes.slice(1, importPathWithQuotes.length);
    return importPath.split(`' + `);
}
function importExportVisitor(ctx, sourceFile, opts = { projectBaseDir: '' }, regexps) {
    const visitor = (node) => {
        if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
            const importPath = pluckDeclarationSpecifier(node, sourceFile);
            const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);
            return ctx.factory.updateImportDeclaration(node, ts.getModifiers(node), node.importClause, ctx.factory.createStringLiteral(rewrittenPath, true), node.assertClause);
        }
        if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
            const importPath = pluckDeclarationSpecifier(node, sourceFile);
            const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);
            return ctx.factory.updateExportDeclaration(node, ts.getModifiers(node), node.isTypeOnly, node.exportClause, ctx.factory.createStringLiteral(rewrittenPath, true), node.assertClause);
        }
        // if (isDynamicImport(node)) {
        // 	console.log(...(node.arguments).map(arg => arg.getText(sourceFile)));
        // 	const [firstImportSegment, ...restImportSegments] = pluckDynamicImportSpecifier(node, sourceFile);
        // 	return ctx.factory.updateCallExpression(
        // 		node,
        // 		node.expression,
        // 		node.typeArguments,
        // 		ctx.factory.createNodeArray([
        // 			// ctx.factory.string
        // 		])
        // 	);
        // }
        if (ts.isTypeReferenceNode(node) && node.typeArguments) {
            return ctx.factory.updateTypeReferenceNode(node, node.typeName, ctx.factory.createNodeArray(node.typeArguments.map(typeArg => {
                return visitor(typeArg);
            })));
        }
        if (ts.isImportTypeNode(node) &&
            ts.isLiteralTypeNode(node.argument) &&
            ts.isStringLiteral(node.argument.literal)) {
            const importPath = node.argument.literal.text;
            const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);
            return ctx.factory.updateImportTypeNode(node, ctx.factory.createLiteralTypeNode(ctx.factory.createStringLiteral(rewrittenPath, true)), node.assertions, node.qualifier, node.typeArguments ? ctx.factory.createNodeArray(node.typeArguments.map(typeArg => {
                return visitor(typeArg);
            })) : undefined, node.isTypeOf);
        }
        // if (
        // 	ts.isImportEqualsDeclaration(node) &&
        // 	ts.isExternalModuleReference(node.moduleReference) &&
        // 	ts.isStringLiteral(node.moduleReference.expression)) {
        // 	const importPath = node.moduleReference.expression.text;
        // 	const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);
        // 	return ctx.factory.updateImportEqualsDeclaration(
        // 		node,
        // 		node.modifiers,
        // 		node.isTypeOnly,
        // 		node.name,
        // 		ctx.factory.createExternalModuleReference(
        // 			ctx.factory.createStringLiteral(rewrittenPath, true)
        // 		)
        // 	);
        // }
        if (ts.isExportAssignment(node) && ts.isStringLiteral(node.expression)) {
            const importPath = node.expression.text;
            const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);
            return ctx.factory.updateExportAssignment(node, node.modifiers, ctx.factory.createStringLiteral(rewrittenPath, true));
        }
        if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;
            const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);
            return ctx.factory.updateExportDeclaration(node, node.modifiers, node.isTypeOnly, node.exportClause, ctx.factory.createStringLiteral(rewrittenPath, true), node.assertClause);
        }
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;
            const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);
            return ctx.factory.updateImportDeclaration(node, node.modifiers, node.importClause, ctx.factory.createStringLiteral(rewrittenPath, true), node.assertClause);
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