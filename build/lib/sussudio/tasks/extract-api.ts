/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { packageConfigs } from '../common';
import { readPackageConfigSubmodules, runAPIExtractor } from '../extractor';


async function extractAPIs() {
	console.log('Extracting Sussudio APIs...');

	for (const packageConfig of packageConfigs) {
		const subModuleExtractorConfigs = await readPackageConfigSubmodules(packageConfig);
		console.log(`${subModuleExtractorConfigs.size} API docs found in ${packageConfig.packageName}...`);

		await runAPIExtractor(subModuleExtractorConfigs);
		break;
	}
}

extractAPIs().catch(err => {
	console.error(err);
	process.exit(1);
});
