/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ts from 'typescript';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import { dirname, join, relative, resolve } from 'path';
import { PathTransformOptions, tsPathTransform } from '../transformers/imports';
import * as prettier from 'prettier';
import { PackageConfig, distRoot, copyrightHeaderLines, packageConfig, sourceRootPathBuilder, sourceRoot, IPackageJsonWithExports, IPackageJsonExportRecord } from '../common';

/** File ends with .js or .mjs */
const jsExtensionPattern = /\.m?js$/;
/** File ends with .d.ts or .d.mts */
const tsDeclarationExtensionPattern = /\.d\.m?ts$/;
const declarePattern = /declare\s+(module|enum|type|interface|abstract|class|namespace|function|const|let)\s+/g;

const pathRewrites = [
	['vs/nls', 'vscode-nls'],
	['vs/base/common/marked/marked', 'marked'],
] as const;

const JS_IMPORT_PREFIX = 'vs';
const CSS_IMPORT_PREFIX = 'vs/css!';

const prettierOptions: prettier.Options = {
	parser: 'typescript',
	singleQuote: true,
	trailingComma: 'all',
	printWidth: 120,
	semi: true,
	useTabs: true,
};

function normalizeExtension(filePath: string) {
	// First, rewrite the path to be compatible with ES modules.
	if (tsDeclarationExtensionPattern.test(filePath)) {
		return filePath.replace('.d.ts', '.d.mts');
	} else if (jsExtensionPattern.test(filePath)) {
		return filePath.replace('.js', '.mjs');
	} else if (!filePath.endsWith('css')) {
		// Add the .mjs extension if it's missing for browser compatiblity.
		return filePath + '.mjs';
	}

	return filePath;
}

/**
 * Rewrites imports to be compatible with ES modules.
 *
 * @param importedPath The path that is being imported.
 * @param importerFilePath The path of the file that is doing the importing.
 */
function rewriteImports(importedPath: string, importerFilePath: string) {
	if (importedPath.startsWith(CSS_IMPORT_PREFIX)) {
		// We need to rewrite relative CSS imports to be relative to the root of the package.
		// e.g. `vs/css!./foo` -> `/vs/${parentPackageName}/absolute/path/to/foo.css`
		// First, remove the CSS loader prefix.
		const relativeCSSImport = importedPath.slice(CSS_IMPORT_PREFIX.length) + '.css';


		// Convert back to 'vs' prefix, relative to the root of the package.
		importedPath = resolve(
			join('/', dirname(importerFilePath.slice(sourceRoot.length))),
			relativeCSSImport)
			.slice(1);
	}

	if (importedPath.startsWith(JS_IMPORT_PREFIX)) {
		for (const [from, to] of pathRewrites) {
			if (importedPath.startsWith(from)) {

				return importedPath.replace(from, to);
			}
		}
	}
	if (importedPath.startsWith('.')) {
		const baseDir = dirname(importerFilePath).slice(sourceRoot.length + 1);
		importedPath = join(baseDir, importedPath);
	}



	// This is a bare import, e.g. `import 'vscode'`.
	if (importedPath.includes('vs/')) {
		return normalizeExtension(importedPath)
			.replace('/vs/', 'sussudio/')
			.replace('vs/', 'sussudio/');
	}


	return importedPath;
}

const transformOpts: PathTransformOptions = {
	rewrite: rewriteImports
};

const customTransformers: ts.CustomTransformers = {
	after: [
		tsPathTransform(transformOpts),
	],
	afterDeclarations: [
		tsPathTransform(transformOpts),
	],
};

function createJSDocHeader(moduleName: string, version: string): string {
	return [
		'/**',
		` * @module ${moduleName}`,
		' * @packageDocumentation',
		` * @version ${version}`,
		' *',
		' * @file This auto-generated file is a part of the Sussudio project, an unofficial internal API for VS Code.',
		' * @license MIT',
		' * @copyright (c) Microsoft Corporation. All rights reserved.',
		' */',
		''
	].join('\n');
}



async function compilePackage({ unscopedPackageName, packageName, packageJSON, distPathBuilder, distSubmoduleBundlePath, distPackageJsonPath, tsConfig, distDirectory }: PackageConfig) {
	await fs.mkdir(distDirectory, { recursive: true });

	const program = ts.createProgram({
		host: ts.createCompilerHost(tsConfig.options, true),
		options: tsConfig.options,
		rootNames: tsConfig.fileNames,
	});

	console.log(`Checking ${program.getSourceFiles().length} files...`);

	logDiagnostics(ts.getPreEmitDiagnostics(program), 'Premitted');

	const declarations: string[] = [];

	const writeFileCallback: ts.WriteFileCallback = (fileName, fileContents, writeByteOrderMark) => {
		const fileIsDeclaration = tsDeclarationExtensionPattern.test(fileName);
		// Don't emit empty declaration files. This prevents API Extractor from parsing them.
		if (fileIsDeclaration && fileContents.length === 0) {
			return;
		}

		// Remove the 'vs' prefix from the file name.
		fileName = fileName.replace(join(distDirectory, 'vs'), distDirectory);

		const fileIsJS = jsExtensionPattern.test(fileName);
		const fileIsFormattable = fileIsJS || fileIsDeclaration;

		const relativePath = relative(distRoot, fileName);
		const moduleName = join(unscopedPackageName, relativePath)
			.replace(jsExtensionPattern, '.mjs')
			.replace(tsDeclarationExtensionPattern, '.mjs');
		const fileHeader = createJSDocHeader(moduleName, packageJSON.version);

		// Remove the default copyright header.
		if (fileContents.startsWith(copyrightHeaderLines)) {
			fileContents = fileContents.slice(copyrightHeaderLines.length);
		}

		// We need to include an index reference comment in JS files to
		// ensure that module resolution works correctly.
		const relativeIndexPath = relative(dirname(fileName), join(distRoot, 'index.d.ts'));

		const indexReferenceComment = `/// <reference path="${relativeIndexPath}" />\n`;

		if (fileIsJS) {
			fileContents = fileHeader + indexReferenceComment + fileContents;
			// Add the .mjs extension if it's missing for browser compatiblity.
			fileName = fileName.replace('.js', '.mjs');
		} else if (fileIsDeclaration) {
			declarations.push(('./' + relativePath)
				.replace('.d.ts', '.d.mts'));

			fileContents = [
				fileHeader,
				indexReferenceComment,
				`declare module "${moduleName}" {`,
				// Anything matching `declare enum`, `declare type` should be removed.
				fileContents.replace(declarePattern, '$1 '),
				'}'
			].join('\n');

			fileName = fileName.replace('.d.ts', '.d.mts');
		}

		// if (fileIsFormattable) {
		// 	fileContents = prettier.format(fileContents, prettierOptions);
		// }

		ts.sys.writeFile(fileName, fileContents, writeByteOrderMark);
	};

	console.log('Emitting files...');
	const emitResult = program.emit(undefined, writeFileCallback, undefined, undefined, customTransformers);


	console.log('Creating package index...');

	const indexStub = [
		copyrightHeaderLines,
		'export default {};'
	];

	const indexDeclaration = [
		copyrightHeaderLines,
		...declarations.map(declaration => {
			return `/// <reference path="${declaration}" />`;
		}),
		'\n',
		`declare module '${packageName}' {`,
		'	const _defaultStub: any;',
		'	export default _defaultStub;',
		'}'
	];

	const exportDeclarations: IPackageJsonExportRecord = {
		'.': {
			'import': './index.js',
			'types': './index.d.ts',
		},
		'./package.json': {
			import: './package.json',
			require: './package.json'
		},
	};

	// Sort alphabetically to ensure consistent output.
	declarations.sort((a, b) => a.localeCompare(b));

	for (const declaration of declarations) {
		const declarationImport = declaration.replace('.d.mts', '.mjs');

		exportDeclarations[declarationImport] = {
			'import': declarationImport,
			'types': declaration,
		};
	}

	const builtPackageJSON: IPackageJsonWithExports = {
		...packageJSON,
		exports: exportDeclarations
	};

	const typingsDirectory = distPathBuilder('typings');

	await fs.mkdir(typingsDirectory, { 'recursive': true });

	console.log('Copying package files...');

	await Promise.all([
		// Include global types in every package...
		fs.cp(sourceRootPathBuilder('typings'), distPathBuilder('typings'), { 'recursive': true }),
		fs.cp(sourceRootPathBuilder('vs/monaco.d.ts'), distPathBuilder('typings', 'monaco.d.ts')),
		fs.cp(sourceRootPathBuilder('vscode-dts'), distPathBuilder('vscode-dts'), { 'recursive': true }),
		fs.cp(sourceRootPathBuilder('vs/loader.js'), distPathBuilder('loader.js')),
		fs.cp(sourceRootPathBuilder('vs/loader.d.ts'), distPathBuilder('loader.d.ts')),
		fs.cp(sourceRootPathBuilder('vs/workbench/contrib/debug/common/debugProtocol.d.ts'), distPathBuilder('typings', 'debugProtocol.d.ts')),
		fs.cp(sourceRootPathBuilder('vs/base/node/languagePacks.js'), distPathBuilder('base/node/languagePacks.mjs')),
		fs.cp(sourceRootPathBuilder('vs/base/node/languagePacks.d.ts'), distPathBuilder('base/node/languagePacks.d.mts')),
		fs.cp(sourceRootPathBuilder('vs/base/common/performance.d.ts'), distPathBuilder('base/common/performance.d.mts')),
		fs.cp(sourceRootPathBuilder('vs/base/common/performance.js'), distPathBuilder('base/common/performance.mjs')),
		fs.cp(sourceRootPathBuilder('vs/workbench/contrib/terminal/browser/xterm-private.d.ts'), distPathBuilder('workbench/contrib/terminal/browser/xterm-private.d.mts')),
		// Package.json for Node compatibility...
		fs.writeFile(distPackageJsonPath, JSON.stringify(builtPackageJSON, null, 2), 'utf8'),
		// Readme...
		fs.copyFile(sourceRootPathBuilder('..', 'README.md'), distPathBuilder('README.md')),
		// All packages use the same license...
		fs.copyFile(sourceRootPathBuilder('..', 'LICENSE.txt'), distPathBuilder('LICENSE.txt')),
		// Include a tsconfig ready for use in the final output for API doc generation...
		fs.copyFile(sourceRootPathBuilder('tsconfig.sussudio-dist.json'), distPathBuilder('tsconfig.json')),
		fs.copyFile(sourceRootPathBuilder('tsconfig.sussudio-dist.json'), distPathBuilder('jsconfig.json')),
		// Submodule declarations for later API doc generation...
		fs.writeFile(distSubmoduleBundlePath, JSON.stringify(declarations, null, 2), 'utf8'),
		// Index files...
		fs.writeFile(distPathBuilder('index.js'), indexStub.join('\n'), 'utf8'),
		fs.writeFile(distPathBuilder('index.d.ts'), indexDeclaration.join('\n'), 'utf8'),
	]);


	return emitResult;
}

function logDiagnostics(diagnostics: readonly ts.Diagnostic[], logLabel: string) {
	if (diagnostics.length === 0) {
		return;
	}

	console.log(`${diagnostics.length} ${logLabel} diagnostic(s)`);

	for (const diagnostic of diagnostics) {
		if (diagnostic.file) {
			const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
		} else {
			console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
		}
	}
}


async function build() {
	const outDir = distRoot;

	if (existsSync(outDir)) {
		console.log('Cleaning', outDir);
		await fs.rm(outDir, { recursive: true });
	}

	await fs.mkdir(outDir);


	console.log('Building Sussudio...');

	const emitResult = await compilePackage(packageConfig);

	logDiagnostics(emitResult.diagnostics, 'Emitted');

	console.log('Copying static files...');
}

build().catch(err => {
	console.error(err);
	process.exit(1);
});
