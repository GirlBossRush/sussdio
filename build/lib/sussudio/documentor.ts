/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MarkdownDocumenter } from '@microsoft/api-documenter/lib/documenters/MarkdownDocumenter';
import { ApiModel } from '@microsoft/api-extractor-model';
import { ModuleExtractorConfigMap } from './extractor';
import { mkdirSync, existsSync } from 'fs';

export function runAPIDocumenter(outputFolder: string, subModuleExtractorConfigs: ModuleExtractorConfigMap) {
	const subModuleCount = subModuleExtractorConfigs.size;
	let moduleIndex = 1;

	if (!existsSync(outputFolder)) {
		mkdirSync(outputFolder, { recursive: true });
	}

	for (const [subModule, extractorConfig] of subModuleExtractorConfigs) {
		console.log(`[${moduleIndex}/${subModuleCount}] Generating docs for ${subModule}...`);

		const apiModel = new ApiModel();
		apiModel.loadPackage(extractorConfig.apiJsonFilePath);

		const markdownDocumenter = new MarkdownDocumenter({
			apiModel,
			outputFolder,
			documenterConfig: undefined
		});

		(markdownDocumenter as any)._deleteOldOutputFiles = () => { };

		markdownDocumenter.generateFiles();

		moduleIndex += 1;
	}
}
