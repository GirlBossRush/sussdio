/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtractorConfig, Extractor } from '@microsoft/api-extractor';
import { PackageNameParser } from '@rushstack/node-core-library/lib/PackageName';
import { ModuleSource } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { moduleDeclarationPattern } from './common';

// HACK: Gets around the fact that the API Extractor doesn't support
// ESM module declarations.
(ExtractorConfig as any)._declarationFileExtensionRegExp = moduleDeclarationPattern;

// HACK: VS Code's TypeScript version is too new for API Extractor.
(Extractor as any)._checkCompilerCompatibility = () => { };

interface ParsedPackage {
	packageName: string;
	scopeName: string;
	unscopedPackageName: string;
	importPath: string;
}

// HACK: Fixes issue where package name parsing prevents submodule paths.
(ModuleSource as any)._fromPackageName = function (parsed: ParsedPackage, packageName: string, importPath?: string) {
	if (!parsed) {
		throw new Error('Parsed package must be provided.');
	}

	let path = packageName;

	if (importPath) {
		path += '/' + importPath;
		parsed.importPath = importPath;
	}

	const source = new ModuleSource(path);
	(source as any)._pathComponents = parsed;
	return source;
};

// HACK: Fixes issue where package name parsing prevents submodule paths.
PackageNameParser.prototype.parse = function (packageName: string) {
	const result = this.tryParse(packageName);

	if (result.error && !result.error.includes('invalid character')) {
		throw new Error(result.error);
	}
	result.error = '';

	return result;
};
