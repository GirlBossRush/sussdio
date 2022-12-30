/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ts from 'typescript';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import { dirname, join, relative } from 'path';
import { PathTransformOptions, tsPathTransform } from './transformers/imports';
import * as prettier from 'prettier';
import { PackageConfig, distRoot, copyrightHeaderLines, packageConfigs, sourceRootPathBuilder } from './common';

/** File ends with .js or .mjs */
const jsExtensionPattern = /\.m?js$/;
/** File ends with .d.ts or .d.mts */
const tsDeclarationExtensionPattern = /\.d\.m?ts$/;


const SOURCE_ROOT = join(__dirname, '../../../', 'src');


const pathRewrites = [
	['vs/nls', 'vscode-nls'],
	['vs/base/common/marked/marked', 'marked'],
	['vs/base', '@sussudio/base'],
	['vs/platform', '@sussudio/platform'],
] as const;

/**
 * Rewrites imports to be compatible with ES modules.
 *
 * @param parentPackageName The name of the package that is doing importing.
 * @param importedPath The path that is being imported.
 * @param importerFilePath The path of the file that is doing the importing.
 */
function rewriteImports(parentPackageName: string, importedPath: string, importerFilePath: string) {
	const importedPathUsesVSPrefix = importedPath.startsWith('vs');
	const importedPathIsRelative = importedPath.startsWith('.');

	if (importedPathUsesVSPrefix) {
		for (const [from, to] of pathRewrites) {
			if (parentPackageName !== from && importedPath.startsWith(from)) {
				return importedPath
					.replace(from, to);
			}
		}
	}

	if (importedPathUsesVSPrefix || importedPathIsRelative) {
		// First, rewrite the path to be compatible with ES modules.
		if (tsDeclarationExtensionPattern.test(importedPath)) {
			importedPath = importedPath.replace('.d.ts', '.d.mts');
		} else if (jsExtensionPattern.test(importedPath)) {
			importedPath = importedPath.replace('.js', '.mjs');
		} else {
			// Add the .mjs extension if it's missing for browser compatiblity.
			importedPath = importedPath + '.mjs';
		}
	}

	if (!importedPathUsesVSPrefix) {
		return importedPath;
	}

	// Make the path absolute to the source root.
	importedPath = importedPath.replace('vs/', '/vs/');

	const absoluteImporterFilePath = join('/', relative(SOURCE_ROOT, importerFilePath));

	// Then, make the path relative.
	const relativePath = relative(dirname(absoluteImporterFilePath), importedPath);

	// Finally, make sure the path is relative.
	return relativePath.startsWith('.') ? relativePath : './' + relativePath;
}

async function compilePackage({ unscopedPackageName, packageName, sourcePackageJsonPath, sourcePathBuilder, distPathBuilder, distSubmoduleBundlePath, distPackageJsonPath, tsConfig, distDirectory }: PackageConfig) {
	console.log(`Compiling package ${packageName}...`);

	await fs.mkdir(distDirectory, { recursive: true });

	const program = ts.createProgram({
		host: ts.createCompilerHost(tsConfig.options, true),
		options: tsConfig.options,
		rootNames: tsConfig.fileNames,
	});


	const declarations: string[] = [];


	const writeFileCallback: ts.WriteFileCallback = (fileName, fileContents, writeByteOrderMark) => {
		const fileIsInPackage = fileName.includes(unscopedPackageName);
		const fileIsDeclaration = tsDeclarationExtensionPattern.test(fileName);
		const fileIsJS = jsExtensionPattern.test(fileName);
		const fileIsFormattable = fileIsJS || fileIsDeclaration;

		// Don't emit files not in package. This prevents clobbering of other packages.
		if (!fileIsInPackage) {
			return;
		}

		if (fileIsDeclaration) {
			if (fileContents.length === 0) {
				// Don't emit empty declaration files.
				// This prevents API Extractor from parsing them.
				return;
			}

			const relativePath = relative(distRoot, fileName);
			declarations.push(relativePath
				.replace(unscopedPackageName + '/', './')
				.replace('.d.ts', '.d.mts'));

			fileContents = [
				// Add copywrite header to generated definitions.
				copyrightHeaderLines,
				fileContents,
			].join('\n');

			fileName = fileName.replace('.d.ts', '.d.mts');
		}

		if (fileName.endsWith('.js')) {
			// Add the .mjs extension if it's missing for browser compatiblity.
			fileName = fileName.replace('.js', '.mjs');
		}

		if (fileIsFormattable) {
			fileContents = prettier.format(fileContents, {
				parser: 'typescript',
				singleQuote: true,
				trailingComma: 'all',
				printWidth: 120,
				semi: true,
				useTabs: true,
			});
		}

		ts.sys.writeFile(fileName, fileContents, writeByteOrderMark);
	};


	const transformOpts: PathTransformOptions = {
		rewrite: rewriteImports.bind(null, `vs/${unscopedPackageName}`),
	};

	const customTransformers: ts.CustomTransformers = {
		after: [
			tsPathTransform(transformOpts)
		],
		afterDeclarations: [
			tsPathTransform(transformOpts)
		]
	};


	const emitResult = program.emit(undefined, writeFileCallback, undefined, undefined, customTransformers);

	const allDiagnostics = ts
		.getPreEmitDiagnostics(program)
		.concat(emitResult.diagnostics);


	allDiagnostics.forEach(diagnostic => {
		if (diagnostic.file) {
			const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
		} else {
			console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
		}
	});

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
		`declare module "${packageName}" {`,
		'	const _defaultStub: any;',
		'	export default _defaultStub;',
		'}'
	];

	const builtCompilerOptions: ts.CompilerOptions = {
		module: ts.ModuleKind.NodeNext,
		target: ts.ScriptTarget.ESNext,
		allowJs: true,
	};

	const builtTSConfig = {
		compilerOptions: builtCompilerOptions,
	};

	console.log('Copying package files...');
	await Promise.all([
		fs.cp(sourceRootPathBuilder('typings'), distPathBuilder('typings'), { 'recursive': true }),
		fs.copyFile(sourcePackageJsonPath, distPackageJsonPath),
		fs.copyFile(sourcePathBuilder('README.md'), distPathBuilder('README.md')),
		fs.copyFile(sourceRootPathBuilder('..', 'LICENSE.txt'), distPathBuilder('LICENSE.txt')),
		fs.writeFile(distPathBuilder('tsconfig.json'), JSON.stringify(builtTSConfig, null, 2), 'utf8'),
		fs.writeFile(distSubmoduleBundlePath, JSON.stringify(declarations), 'utf8'),
		fs.writeFile(distPathBuilder('index.js'), indexStub.join('\n'), 'utf8'),
		fs.writeFile(distPathBuilder('index.d.ts'), indexDeclaration.join('\n'), 'utf8'),
	]);
}


async function build() {
	const outDir = distRoot;

	if (existsSync(outDir)) {
		console.log('Cleaning', outDir);
		await fs.rm(outDir, { recursive: true });
	}

	await fs.mkdir(outDir);


	console.log('Building Sussudio...');

	for (const packageConfig of packageConfigs) {
		await compilePackage(packageConfig);
	}

	console.log('Copying static files...');
}

build().catch(err => {
	console.error(err);
	process.exit(1);
});
