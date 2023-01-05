/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { packageConfigs, repoRootPathBuilder } from '../common';
import { runAPIDocumenter } from '../documentor';
import { readPackageConfigSubmodules } from '../extractor';


async function generateDocs() {
	console.log('Creating Sussudio API Documentation...');

	for (const packageConfig of packageConfigs) {
		const subModuleExtractorConfigs = readPackageConfigSubmodules(packageConfig);
		console.log(`${subModuleExtractorConfigs.size} API docs found in ${packageConfig.packageName}...`);

		runAPIDocumenter(repoRootPathBuilder('docs', packageConfig.unscopedPackageName), subModuleExtractorConfigs);
		break;
	}
}

generateDocs().catch(err => {
	console.error(err);
	process.exit(1);
});
