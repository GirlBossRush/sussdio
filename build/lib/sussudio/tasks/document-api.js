"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const documentor_1 = require("../documentor");
const extractor_1 = require("../extractor");
async function generateDocs() {
    console.log('Creating Sussudio API Documentation...');
    for (const packageConfig of common_1.packageConfigs) {
        const subModuleExtractorConfigs = (0, extractor_1.readPackageConfigSubmodules)(packageConfig);
        console.log(`${subModuleExtractorConfigs.size} API docs found in ${packageConfig.packageName}...`);
        (0, documentor_1.runAPIDocumenter)((0, common_1.repoRootPathBuilder)('docs', packageConfig.unscopedPackageName), subModuleExtractorConfigs);
        break;
    }
}
generateDocs().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnQtYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZG9jdW1lbnQtYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRzs7QUFFaEcsc0NBQWdFO0FBQ2hFLDhDQUFpRDtBQUNqRCw0Q0FBMkQ7QUFHM0QsS0FBSyxVQUFVLFlBQVk7SUFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0lBRXRELEtBQUssTUFBTSxhQUFhLElBQUksdUJBQWMsRUFBRTtRQUMzQyxNQUFNLHlCQUF5QixHQUFHLElBQUEsdUNBQTJCLEVBQUMsYUFBYSxDQUFDLENBQUM7UUFDN0UsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLHlCQUF5QixDQUFDLElBQUksc0JBQXNCLGFBQWEsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDO1FBRW5HLElBQUEsNkJBQWdCLEVBQUMsSUFBQSw0QkFBbUIsRUFBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLG1CQUFtQixDQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUM1RyxNQUFNO0tBQ047QUFDRixDQUFDO0FBRUQsWUFBWSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQzFCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyJ9