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

function pluckDeclarationSpecifier(node: ts.ImportDeclaration | ts.ExportDeclaration, sourceFile: ts.SourceFile) {
	const importPathWithQuotes = node.moduleSpecifier!.getText(sourceFile);
	return importPathWithQuotes.slice(1, importPathWithQuotes.length - 1);
}

function pluckDynamicImportSpecifier(node: ts.CallExpression, sourceFile: ts.SourceFile) {
	const importPathWithQuotes = node.arguments[0].getText(sourceFile);
	const importPath = importPathWithQuotes.slice(1, importPathWithQuotes.length);

	return importPath.split(`' + `);
}

function importExportVisitor(
	ctx: ts.TransformationContext,
	sourceFile: ts.SourceFile,
	opts: PathTransformOptions = { projectBaseDir: '' },
	regexps: Record<string, RegExp>
) {
	const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
		if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
			const importPath = pluckDeclarationSpecifier(node, sourceFile);
			const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);

			return ctx.factory.updateImportDeclaration(
				node,
				ts.getModifiers(node),
				node.importClause,
				ctx.factory.createStringLiteral(rewrittenPath, true),
				node.assertClause);
		}

		if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
			const importPath = pluckDeclarationSpecifier(node, sourceFile);
			const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);

			return ctx.factory.updateExportDeclaration(
				node,
				ts.getModifiers(node),
				node.isTypeOnly,
				node.exportClause,
				ctx.factory.createStringLiteral(rewrittenPath, true),
				node.assertClause
			);
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
			return ctx.factory.updateTypeReferenceNode(
				node,
				node.typeName,
				ctx.factory.createNodeArray(
					node.typeArguments.map(typeArg => {
						return visitor(typeArg) as any;
					})
				)
			);
		}

		if (
			ts.isImportTypeNode(node) &&
			ts.isLiteralTypeNode(node.argument) &&
			ts.isStringLiteral(node.argument.literal)) {
			const importPath = node.argument.literal.text;
			const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);

			return ctx.factory.updateImportTypeNode(
				node,
				ctx.factory.createLiteralTypeNode(
					ctx.factory.createStringLiteral(rewrittenPath, true)
				),
				node.assertions,
				node.qualifier,
				node.typeArguments ? ctx.factory.createNodeArray(node.typeArguments.map(typeArg => {
					return visitor(typeArg) as any;
				})) : undefined,
				node.isTypeOf,
			);
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

			return ctx.factory.updateExportAssignment(
				node,
				node.modifiers,
				ctx.factory.createStringLiteral(rewrittenPath, true)
			);
		}

		if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
			const importPath = node.moduleSpecifier.text;
			const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);

			return ctx.factory.updateExportDeclaration(
				node,
				node.modifiers,
				node.isTypeOnly,
				node.exportClause,
				ctx.factory.createStringLiteral(rewrittenPath, true),
				node.assertClause
			);
		}

		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
			const importPath = node.moduleSpecifier.text;
			const rewrittenPath = rewritePath(importPath, sourceFile, opts, regexps);

			return ctx.factory.updateImportDeclaration(
				node,
				node.modifiers,
				node.importClause,
				ctx.factory.createStringLiteral(rewrittenPath, true),
				node.assertClause
			);
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
