/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtractorConfig, Extractor } from '@microsoft/api-extractor';
import { MarkdownDocumenter } from '@microsoft/api-documenter//lib/documenters/MarkdownDocumenter';
import { ApiModel } from '@microsoft/api-extractor-model';
import { PackageConfig, packageConfigs } from './common';
import * as fs from 'fs/promises';
import { basename, dirname, join } from 'path';

const declarationPattern = /\.d\.m?ts$/i;
// HACK: Gets around the fact that the API Extractor doesn't support
// ESM module declarations.
(ExtractorConfig as any)._declarationFileExtensionRegExp = declarationPattern;

// HACK: VS Code's TypeScript version is too new for API Extractor.
(Extractor as any)._checkCompilerCompatibility = () => { };

/**
 * Creates an API-Extractor config.
 */
export function createAPIExtractorConfig(subModulePath: string, { unscopedPackageName, sourcePathBuilder, distPathBuilder, distDirectory, packageJSON, distPackageJsonPath, tsConfig }: PackageConfig) {
	const submoduleDirectory = dirname(subModulePath);
	const submoduleBaseName = basename(subModulePath);
	const absoluteSubmodulePath = join(distDirectory, subModulePath);
	const submoduleName = submoduleBaseName.replace(declarationPattern, '');
	const reportFileName = submoduleBaseName.replace(declarationPattern, '.api.md');

	const extractorConfig = ExtractorConfig.prepare({
		configObjectFullPath: undefined,
		packageJsonFullPath: distPackageJsonPath,
		packageJson: {
			...packageJSON,
			name: `@sussudio/${join(unscopedPackageName, submoduleDirectory, submoduleName).replace(/\//g, '.')}`
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
				reportFolder: sourcePathBuilder('temp', submoduleDirectory),
				reportTempFolder: sourcePathBuilder('temp', submoduleDirectory),
				reportFileName,
			},
			docModel: {
				apiJsonFilePath: '<projectFolder>/temp/<unscopedPackageName>.api.json',
				enabled: true,
				includeForgottenExports: true,
				projectFolderUrl: 'https://github.com/GirlBossRush/sussudio/tree/main/src'
			}
		}
	});


	return extractorConfig;
}

async function runAPIExtractor(packageConfig: PackageConfig) {
	const subModuleBundleContent = await fs.readFile(packageConfig.distSubmoduleBundlePath);
	const subModuleBundle: string[] = JSON.parse(subModuleBundleContent.toString());

	const subModuleCount = subModuleBundle.length;
	console.log(`${subModuleBundle.length} API docs found in ${packageConfig.packageName}...`);

	for (const [index, subModule] of subModuleBundle.entries()) {
		const extractorConfig = createAPIExtractorConfig(subModule, packageConfig);
		console.log(`[${index}/${subModuleCount}]Generating API docs for ${subModule}...`);

		const extractorResult = Extractor.invoke(extractorConfig, {
			localBuild: true,
		});

		if (!extractorResult.succeeded) {
			throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors`
				+ ` and ${extractorResult.warningCount} warnings`);
		}
	}
}

async function runAPIDocumenter(packageConfig: PackageConfig) {
	const apiModel = new ApiModel();
	// TODO: Fix this.
	// apiModel.loadPackage(packageConfig);

	const markdownDocumenter = new MarkdownDocumenter({
		apiModel,
		outputFolder: packageConfig.distPathBuilder('docs'),
		documenterConfig: undefined
	});

	markdownDocumenter.generateFiles();
}

async function generateDocs() {
	console.log('Generating Sussudio docs...');

	for (const packageConfig of packageConfigs) {
		await runAPIExtractor(packageConfig);

		await runAPIDocumenter(packageConfig);
		break;
	}

}

generateDocs().catch(err => {
	console.error(err);
	process.exit(1);
});
