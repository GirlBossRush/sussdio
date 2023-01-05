"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAPIDocumenter = void 0;
const MarkdownDocumenter_1 = require("@microsoft/api-documenter/lib/documenters/MarkdownDocumenter");
const api_extractor_model_1 = require("@microsoft/api-extractor-model");
const fs_1 = require("fs");
function runAPIDocumenter(outputFolder, subModuleExtractorConfigs) {
    const subModuleCount = subModuleExtractorConfigs.size;
    let moduleIndex = 1;
    if (!(0, fs_1.existsSync)(outputFolder)) {
        (0, fs_1.mkdirSync)(outputFolder, { recursive: true });
    }
    for (const [subModule, extractorConfig] of subModuleExtractorConfigs) {
        console.log(`[${moduleIndex}/${subModuleCount}] Generating docs for ${subModule}...`);
        const apiModel = new api_extractor_model_1.ApiModel();
        apiModel.loadPackage(extractorConfig.apiJsonFilePath);
        const markdownDocumenter = new MarkdownDocumenter_1.MarkdownDocumenter({
            apiModel,
            outputFolder,
            documenterConfig: undefined
        });
        markdownDocumenter._deleteOldOutputFiles = () => { };
        markdownDocumenter.generateFiles();
        moduleIndex += 1;
    }
}
exports.runAPIDocumenter = runAPIDocumenter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRvY3VtZW50b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHOzs7QUFFaEcscUdBQWtHO0FBQ2xHLHdFQUEwRDtBQUUxRCwyQkFBMkM7QUFFM0MsU0FBZ0IsZ0JBQWdCLENBQUMsWUFBb0IsRUFBRSx5QkFBbUQ7SUFDekcsTUFBTSxjQUFjLEdBQUcseUJBQXlCLENBQUMsSUFBSSxDQUFDO0lBQ3RELElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztJQUVwQixJQUFJLENBQUMsSUFBQSxlQUFVLEVBQUMsWUFBWSxDQUFDLEVBQUU7UUFDOUIsSUFBQSxjQUFTLEVBQUMsWUFBWSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7S0FDN0M7SUFFRCxLQUFLLE1BQU0sQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLElBQUkseUJBQXlCLEVBQUU7UUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsSUFBSSxjQUFjLHlCQUF5QixTQUFTLEtBQUssQ0FBQyxDQUFDO1FBRXRGLE1BQU0sUUFBUSxHQUFHLElBQUksOEJBQVEsRUFBRSxDQUFDO1FBQ2hDLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXRELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx1Q0FBa0IsQ0FBQztZQUNqRCxRQUFRO1lBQ1IsWUFBWTtZQUNaLGdCQUFnQixFQUFFLFNBQVM7U0FDM0IsQ0FBQyxDQUFDO1FBRUYsa0JBQTBCLENBQUMscUJBQXFCLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRTlELGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRW5DLFdBQVcsSUFBSSxDQUFDLENBQUM7S0FDakI7QUFDRixDQUFDO0FBMUJELDRDQTBCQyJ9