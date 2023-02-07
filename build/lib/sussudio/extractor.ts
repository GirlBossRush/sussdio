/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './monkeypatch';

import { ExtractorConfig, Extractor } from '@microsoft/api-extractor';
import { TSDocTagSyntaxKind, Standardization, TSDocTagDefinition } from '@microsoft/tsdoc';
import { PackageConfig, moduleDeclarationPattern, repoRootPathBuilder } from './common';
import { basename, dirname, join } from 'path';
import { readFileSync, mkdirSync, existsSync } from 'fs';

export const reportFolder = repoRootPathBuilder('_api-review');
export const reportTempFolder = repoRootPathBuilder('_api-extractor-temp');
export const docModelTempFolder = join(reportTempFolder, 'doc-models');

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
	// Used to define a module.
	{
		tagName: '@module',
		allowMultiple: false,
		standardization: Standardization.None,
		syntaxKind: TSDocTagSyntaxKind.BlockTag,
		tagNameWithUpperCase: '@MODULE'
	},
];

/**
 * Creates an API-Extractor config.
 */
export function createAPIExtractorConfig(submodulePath: string, { unscopedPackageName, distPathBuilder, distDirectory, packageJSON, distPackageJsonPath, tsConfig }: PackageConfig) {
	const submoduleDirectory = dirname(submodulePath);
	const submoduleBaseName = basename(submodulePath);
	const absoluteSubmodulePath = join(distDirectory, submodulePath);
	const submoduleName = submoduleBaseName.replace(moduleDeclarationPattern, '');
	const reportFileName = submoduleBaseName.replace(moduleDeclarationPattern, '.api.md');
	const submodulePackageName = join(unscopedPackageName, submoduleDirectory, submoduleName);
	const dotdelimitedPackageName = submodulePackageName.replace(/\//g, '.');

	const projectFolder = dirname(absoluteSubmodulePath);


	const extractorConfig = ExtractorConfig.prepare({
		configObjectFullPath: undefined,
		packageJsonFullPath: distPackageJsonPath,

		packageJson: {
			...packageJSON,
			name: dotdelimitedPackageName
		},
		configObject: {
			newlineKind: 'lf',
			bundledPackages: [
				'@sussudio/base/common/lifecycle.mjs'
			],
			compiler: {
				overrideTsconfig: {
					...tsConfig,
					include: [
						'**/*.ts',
						absoluteSubmodulePath,
						// HACK: Include global typings for the project.
						distPathBuilder('typings')
					],
				},
			},
			projectFolder,
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
				projectFolderUrl: 'https://github.com/sister.software/sussudio/tree/main/src'
			},
		}
	});

	// HACK: Fixes issue where package name parsing prevents submodule paths.
	extractorConfig.packageJson!.name = submodulePackageName + '.mjs';

	// console.log('>>>', extractorConfig.packageJson!.name);
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
			localBuild: process.env.NODE_ENV !== 'production' && !!process.env.CI
		});

		if (!extractorResult.succeeded) {
			throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors`
				+ ` and ${extractorResult.warningCount} warnings`);
		}

		moduleIndex += 1;
	}
}

