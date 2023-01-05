/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtractorConfig, Extractor } from '@microsoft/api-extractor';
import { PackageNameParser } from '@rushstack/node-core-library/lib/PackageName';
import { ModuleSource } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { TSDocTagSyntaxKind, Standardization, TSDocTagDefinition } from '@microsoft/tsdoc';
import { PackageConfig, repoRootPathBuilder, scopePrefix } from './common';
import { basename, dirname, join } from 'path';
import { readFileSync, mkdirSync, existsSync } from 'fs';

export const reportFolder = repoRootPathBuilder('_api-review');
export const reportTempFolder = repoRootPathBuilder('_api-extractor-temp');
export const docModelTempFolder = join(reportTempFolder, 'doc-models');

const declarationPattern = /\.d\.m?ts$/i;
// HACK: Gets around the fact that the API Extractor doesn't support
// ESM module declarations.
(ExtractorConfig as any)._declarationFileExtensionRegExp = declarationPattern;

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

const tSDocTagDefinitions: readonly TSDocTagDefinition[] = [
	// Fixes many mispellings of @return
	{
		tagName: '@return',
		allowMultiple: true,
		standardization: Standardization.Core,
		syntaxKind: TSDocTagSyntaxKind.BlockTag,
		tagNameWithUpperCase: '@RETURN'
	},
	// Denotes supported platforms.
	// e.g. @platform darwin,mas
	{
		tagName: '@platform',
		allowMultiple: false,
		standardization: Standardization.None,
		syntaxKind: TSDocTagSyntaxKind.BlockTag,
		tagNameWithUpperCase: '@PLATFORM'
	},
	// Denotes a declaration as an event listener.
	{
		tagName: '@event',
		allowMultiple: false,
		standardization: Standardization.None,
		syntaxKind: TSDocTagSyntaxKind.BlockTag,
		tagNameWithUpperCase: '@EVENT'
	},

	// Used to clarify changes made to upstream
	{
		tagName: '@sussudio',
		allowMultiple: false,
		standardization: Standardization.None,
		syntaxKind: TSDocTagSyntaxKind.BlockTag,
		tagNameWithUpperCase: '@SUSSUDIO'
	},
];

/**
 * Creates an API-Extractor config.
 */
export function createAPIExtractorConfig(submodulePath: string, { unscopedPackageName, distPathBuilder, distDirectory, packageJSON, distPackageJsonPath, tsConfig }: PackageConfig) {
	const submoduleDirectory = dirname(submodulePath);
	const submoduleBaseName = basename(submodulePath);
	const absoluteSubmodulePath = join(distDirectory, submodulePath);
	const submoduleName = submoduleBaseName.replace(declarationPattern, '');
	const reportFileName = submoduleBaseName.replace(declarationPattern, '.api.md');
	const submodulePackageName = join(unscopedPackageName, submoduleDirectory, submoduleName);
	const dotdelimitedPackageName = submodulePackageName.replace(/\//g, '.');

	const extractorConfig = ExtractorConfig.prepare({
		configObjectFullPath: undefined,
		packageJsonFullPath: distPackageJsonPath,
		packageJson: {
			...packageJSON,
			name: join(scopePrefix, dotdelimitedPackageName)
		},
		configObject: {
			compiler: {
				overrideTsconfig: {
					...tsConfig,
					include: [
						absoluteSubmodulePath,
						// HACK: Include global typings for the project.
						distPathBuilder('typings')
					],
				},
			},
			projectFolder: dirname(absoluteSubmodulePath),
			mainEntryPointFilePath: absoluteSubmodulePath,
			apiReport: {
				enabled: true,
				includeForgottenExports: true,
				reportFolder: join(reportFolder, unscopedPackageName, submoduleDirectory),
				reportTempFolder: join(reportTempFolder, unscopedPackageName, submoduleDirectory),
				reportFileName,
			},
			docModel: {
				apiJsonFilePath: join(docModelTempFolder, `${dotdelimitedPackageName}.api.json`),
				enabled: true,
				includeForgottenExports: true,
				projectFolderUrl: 'https://github.com/GirlBossRush/sussudio/tree/main/src'
			},
		}
	});

	extractorConfig.packageJson!.name = join(scopePrefix, submodulePackageName);
	extractorConfig.tsdocConfiguration.addTagDefinitions(tSDocTagDefinitions, true);

	return extractorConfig;
}

export type ModuleExtractorConfigMap = Map<string, ExtractorConfig>;

export function readPackageConfigSubmodules(packageConfig: PackageConfig): ModuleExtractorConfigMap {
	const subModuleBundleContent = readFileSync(packageConfig.distSubmoduleBundlePath);
	const subModuleBundle: string[] = JSON.parse(subModuleBundleContent.toString());

	const subModuleExtractorConfigs: ModuleExtractorConfigMap = new Map(subModuleBundle.map(subModule => {

		return [subModule, createAPIExtractorConfig(subModule, packageConfig)];
	}));

	return subModuleExtractorConfigs;
}

export async function runAPIExtractor(subModuleExtractorConfigs: ModuleExtractorConfigMap) {
	const subModuleCount = subModuleExtractorConfigs.size;
	let moduleIndex = 1;

	for (const [subModule, extractorConfig] of subModuleExtractorConfigs) {
		console.log(`[${moduleIndex}/${subModuleCount}] Extracting API for ${subModule}...`);

		const reportDirectories = [
			dirname(extractorConfig.reportFilePath),
			dirname(extractorConfig.reportTempFilePath)
		];

		reportDirectories.forEach(dir => {
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
		});

		// TODO: Consider running this in parallel.
		const extractorResult = Extractor.invoke(extractorConfig, {
			localBuild: true,
		});

		if (!extractorResult.succeeded) {
			throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors`
				+ ` and ${extractorResult.warningCount} warnings`);
		}

		moduleIndex += 1;
	}
}

