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
    const subModuleExtractorConfigs = await (0, extractor_1.readPackageConfigSubmodules)(common_1.packageConfig);
    console.log(`${subModuleExtractorConfigs.size} API docs found in ${common_1.packageConfig.packageName}...`);
    await (0, extractor_1.runAPIExtractor)(subModuleExtractorConfigs);
}
extractAPIs().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdC1hcGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleHRyYWN0LWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7O0FBRWhHLHNDQUEwQztBQUMxQyw0Q0FBNEU7QUFHNUUsS0FBSyxVQUFVLFdBQVc7SUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLE1BQU0seUJBQXlCLEdBQUcsTUFBTSxJQUFBLHVDQUEyQixFQUFDLHNCQUFhLENBQUMsQ0FBQztJQUNuRixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcseUJBQXlCLENBQUMsSUFBSSxzQkFBc0Isc0JBQWEsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDO0lBRW5HLE1BQU0sSUFBQSwyQkFBZSxFQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUVELFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUN6QixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMifQ==