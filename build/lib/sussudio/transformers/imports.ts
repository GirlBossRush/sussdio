/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ts from 'typescript';
import { resolve, dirname } from 'path';

export interface PathTransformOptions {
	projectBaseDir?: string;
	project?: string;
	/**
	 * @param importPath The path to the file being imported.
	 * @param sourceFilePath The path to the file containing the import statement.
	 */
	rewrite?(importPath: string, sourceFilePath: string): string;
	/**
	 *
	 */
	alias?: Record<string, string>;
}

/**
 * Rewrite relative import to absolute import or trigger
 */
function rewritePath(importPath: string, sourceFile: ts.SourceFile, opts: PathTransformOptions, regexps: Record<string, RegExp>) {
	const aliases = Object.keys(regexps);
	for (const alias of aliases) {
		const regex = regexps[alias];
		if (regexps[alias].test(importPath)) {
			return importPath.replace(regex, opts.alias![alias]);
		}
	}

	if (typeof opts.rewrite === 'function') {
		const newImportPath = opts.rewrite(importPath, sourceFile.fileName);
		if (newImportPath) {
			return newImportPath;
		}
	}

	if (opts.project && opts.projectBaseDir && importPath.startsWith('.')) {
		const path = resolve(dirname(sourceFile.fileName), importPath).split(opts.projectBaseDir)[1];
		return `${opts.project}${path}`;
	}

	return importPath;
}

function isDynamicImport(node: ts.Node): node is ts.CallExpression {
	return ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
}

function importExportVisitor(
	ctx: ts.TransformationContext,
	sourceFile: ts.SourceFile,
	opts: PathTransformOptions = { projectBaseDir: '' },
	regexps: Record<string, RegExp>
) {
	const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
		let importPath: string | undefined;

		if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
			const importPathWithQuotes = node.moduleSpecifier.getText(sourceFile);
			importPath = importPathWithQuotes.slice(1, importPathWithQuotes.length - 1);
		} else if (isDynamicImport(node)) {
			const importPathWithQuotes = node.arguments[0].getText(sourceFile);
			importPath = importPathWithQuotes.slice(1, importPathWithQuotes.length - 1);
		} else if (
			ts.isImportTypeNode(node) &&
			ts.isLiteralTypeNode(node.argument) &&
			ts.isStringLiteral(node.argument.literal)
		) {
			// `.text` instead of `getText` bc this node doesn't map to sf (it's generated d.ts)
			importPath = node.argument.literal.text;
		}

		if (importPath) {
			const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);

			// Only rewrite relative path.
			if (rewrittenPath !== importPath) {
				if (ts.isImportDeclaration(node)) {

					return ctx.factory.updateImportDeclaration(
						node,
						ts.getModifiers(node),
						node.importClause,
						ctx.factory.createStringLiteral(rewrittenPath),
						node.assertClause);

				} else if (ts.isExportDeclaration(node)) {
					return ctx.factory.updateExportDeclaration(
						node,
						ts.getModifiers(node),
						node.isTypeOnly,
						node.exportClause,
						ctx.factory.createStringLiteral(rewrittenPath),
						node.assertClause
					);
				} else if (isDynamicImport(node)) {
					return ctx.factory.updateCallExpression(
						node,
						node.expression,
						node.typeArguments,
						ctx.factory.createNodeArray([
							ctx.factory.createStringLiteral(rewrittenPath),
						])
					);
				} else if (ts.isImportTypeNode(node)) {
					return ctx.factory.updateImportTypeNode(
						node,
						ctx.factory.createLiteralTypeNode(
							ctx.factory.createStringLiteral(rewrittenPath)
						),
						node.assertions,
						node.qualifier,
						node.typeArguments,
						node.isTypeOf,
					);
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
export function tsPathTransform(opts: PathTransformOptions): ts.CustomTransformerFactory {
	const { alias = {} } = opts;

	const regexps: Record<string, RegExp> = Object.keys(alias).reduce(
		(all, regexString) => {
			all[regexString] = new RegExp(regexString, 'gi');
			return all;
		},
		{} as Record<string, RegExp>
	);

	const transformFactory: ts.CustomTransformerFactory = (ctx: ts.TransformationContext) => {
		const transformSourceFile = (node: ts.SourceFile): ts.SourceFile => {
			return ts.visitNode(node, importExportVisitor(ctx, node, opts, regexps));
		};

		const transformBundle = (node: ts.Bundle): ts.Bundle => {
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
