"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../common");
const extractor_1 = require("../extractor");
async function extractAPIs() {
    console.log('Extracting Sussudio APIs...');
    for (const packageConfig of common_1.packageConfigs) {
        const subModuleExtractorConfigs = await (0, extractor_1.readPackageConfigSubmodules)(packageConfig);
        console.log(`${subModuleExtractorConfigs.size} API docs found in ${packageConfig.packageName}...`);
        await (0, extractor_1.runAPIExtractor)(subModuleExtractorConfigs);
        break;
    }
}
extractAPIs().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdC1hcGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleHRyYWN0LWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7O0FBRWhHLHNDQUEyQztBQUMzQyw0Q0FBNEU7QUFHNUUsS0FBSyxVQUFVLFdBQVc7SUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLEtBQUssTUFBTSxhQUFhLElBQUksdUJBQWMsRUFBRTtRQUMzQyxNQUFNLHlCQUF5QixHQUFHLE1BQU0sSUFBQSx1Q0FBMkIsRUFBQyxhQUFhLENBQUMsQ0FBQztRQUNuRixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcseUJBQXlCLENBQUMsSUFBSSxzQkFBc0IsYUFBYSxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUM7UUFFbkcsTUFBTSxJQUFBLDJCQUFlLEVBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNqRCxNQUFNO0tBQ047QUFDRixDQUFDO0FBRUQsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyJ9