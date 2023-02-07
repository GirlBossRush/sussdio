/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import '../monkeypatch';
import { packageConfig, repoRootPathBuilder } from '../common';
import { readPackageConfigSubmodules } from '../extractor';
import * as TypeDoc from 'typedoc';


async function generateDocs() {
	console.log('Creating Sussudio API Documentation...');

	const subModuleExtractorConfigs = readPackageConfigSubmodules(packageConfig);
	console.log(`${subModuleExtractorConfigs.size} API docs found in ${packageConfig.packageName}...`);
	console.log(packageConfig.packageName);

	const entryPoints = Array.from(subModuleExtractorConfigs.values(), config => config.mainEntryPointFilePath);
	console.log(entryPoints);
	console.log(packageConfig.distPathBuilder('tsconfig.json'), 'tsconfig.json');
	const app = new TypeDoc.Application();

	app.options.addReader(new TypeDoc.TSConfigReader());
	const outDir = repoRootPathBuilder('wiki');

	app.bootstrap({
		entryPoints,
		out: outDir,
		cleanOutputDir: true,
		tsconfig: packageConfig.distPathBuilder('tsconfig.json'),
		theme: 'github-wiki',
		plugin: ['typedoc-plugin-markdown', 'typedoc-github-wiki-theme'],
		excludeProtected: true,
		excludeExternals: true,
	});

	const project = app.convert();

	if (project) {
		app.generateDocs(project, outDir);
	}
}

generateDocs().catch(err => {
	console.error(err);
	process.exit(1);
});
