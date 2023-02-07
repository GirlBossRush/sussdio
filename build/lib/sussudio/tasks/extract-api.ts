/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { packageConfig } from '../common';
import { readPackageConfigSubmodules, runAPIExtractor } from '../extractor';


async function extractAPIs() {
	console.log('Extracting Sussudio APIs...');

	const subModuleExtractorConfigs = await readPackageConfigSubmodules(packageConfig);
	console.log(`${subModuleExtractorConfigs.size} API docs found in ${packageConfig.packageName}...`);

	await runAPIExtractor(subModuleExtractorConfigs);
}

extractAPIs().catch(err => {
	console.error(err);
	process.exit(1);
});
