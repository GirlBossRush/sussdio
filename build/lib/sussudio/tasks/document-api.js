"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
require("../monkeypatch");
const common_1 = require("../common");
const extractor_1 = require("../extractor");
const TypeDoc = require("typedoc");
async function generateDocs() {
    console.log('Creating Sussudio API Documentation...');
    const subModuleExtractorConfigs = (0, extractor_1.readPackageConfigSubmodules)(common_1.packageConfig);
    console.log(`${subModuleExtractorConfigs.size} API docs found in ${common_1.packageConfig.packageName}...`);
    console.log(common_1.packageConfig.packageName);
    const entryPoints = Array.from(subModuleExtractorConfigs.values(), config => config.mainEntryPointFilePath);
    console.log(entryPoints);
    console.log(common_1.packageConfig.distPathBuilder('tsconfig.json'), 'tsconfig.json');
    const app = new TypeDoc.Application();
    app.options.addReader(new TypeDoc.TSConfigReader());
    const outDir = (0, common_1.repoRootPathBuilder)('wiki');
    app.bootstrap({
        entryPoints,
        out: outDir,
        cleanOutputDir: true,
        tsconfig: common_1.packageConfig.distPathBuilder('tsconfig.json'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnQtYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZG9jdW1lbnQtYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRzs7QUFFaEcsMEJBQXdCO0FBQ3hCLHNDQUErRDtBQUMvRCw0Q0FBMkQ7QUFDM0QsbUNBQW1DO0FBR25DLEtBQUssVUFBVSxZQUFZO0lBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsQ0FBQztJQUV0RCxNQUFNLHlCQUF5QixHQUFHLElBQUEsdUNBQTJCLEVBQUMsc0JBQWEsQ0FBQyxDQUFDO0lBQzdFLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLHNCQUFzQixzQkFBYSxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUM7SUFDbkcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRXZDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUM1RyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQWEsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDN0UsTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFdEMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUNwRCxNQUFNLE1BQU0sR0FBRyxJQUFBLDRCQUFtQixFQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRTNDLEdBQUcsQ0FBQyxTQUFTLENBQUM7UUFDYixXQUFXO1FBQ1gsR0FBRyxFQUFFLE1BQU07UUFDWCxjQUFjLEVBQUUsSUFBSTtRQUNwQixRQUFRLEVBQUUsc0JBQWEsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDO1FBQ3hELEtBQUssRUFBRSxhQUFhO1FBQ3BCLE1BQU0sRUFBRSxDQUFDLHlCQUF5QixFQUFFLDJCQUEyQixDQUFDO1FBQ2hFLGdCQUFnQixFQUFFLElBQUk7UUFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtLQUN0QixDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFOUIsSUFBSSxPQUFPLEVBQUU7UUFDWixHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztLQUNsQztBQUNGLENBQUM7QUFFRCxZQUFZLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDMUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDIn0=