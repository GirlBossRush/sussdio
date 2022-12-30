"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAPIExtractorConfig = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const api_extractor_1 = require("@microsoft/api-extractor");
const MarkdownDocumenter_1 = require("@microsoft/api-documenter//lib/documenters/MarkdownDocumenter");
const api_extractor_model_1 = require("@microsoft/api-extractor-model");
const common_1 = require("./common");
const fs = require("fs/promises");
const path_1 = require("path");
const declarationPattern = /\.d\.m?ts$/i;
// HACK: Gets around the fact that the API Extractor doesn't support
// ESM module declarations.
api_extractor_1.ExtractorConfig._declarationFileExtensionRegExp = declarationPattern;
// HACK: VS Code's TypeScript version is too new for API Extractor.
api_extractor_1.Extractor._checkCompilerCompatibility = () => { };
/**
 * Creates an API-Extractor config.
 */
function createAPIExtractorConfig(subModulePath, { unscopedPackageName, sourcePathBuilder, distPathBuilder, distDirectory, packageJSON, distPackageJsonPath, tsConfig }) {
    const submoduleDirectory = (0, path_1.dirname)(subModulePath);
    const submoduleBaseName = (0, path_1.basename)(subModulePath);
    const absoluteSubmodulePath = (0, path_1.join)(distDirectory, subModulePath);
    const submoduleName = submoduleBaseName.replace(declarationPattern, '');
    const reportFileName = submoduleBaseName.replace(declarationPattern, '.api.md');
    const extractorConfig = api_extractor_1.ExtractorConfig.prepare({
        configObjectFullPath: undefined,
        packageJsonFullPath: distPackageJsonPath,
        packageJson: {
            ...packageJSON,
            name: `@sussudio/${(0, path_1.join)(unscopedPackageName, submoduleDirectory, submoduleName).replace(/\//g, '.')}`
        },
        configObject: {
            compiler: {
                overrideTsconfig: {
                    ...tsConfig,
                    include: [
                        absoluteSubmodulePath,
                        // HACK: Include global typings for the project.
                        distPathBuilder('typings')
                    ],
                },
            },
            projectFolder: (0, path_1.dirname)(absoluteSubmodulePath),
            mainEntryPointFilePath: absoluteSubmodulePath,
            apiReport: {
                enabled: true,
                includeForgottenExports: true,
                reportFolder: sourcePathBuilder('temp', submoduleDirectory),
                reportTempFolder: sourcePathBuilder('temp', submoduleDirectory),
                reportFileName,
            },
            docModel: {
                apiJsonFilePath: '<projectFolder>/temp/<unscopedPackageName>.api.json',
                enabled: true,
                includeForgottenExports: true,
                projectFolderUrl: 'https://github.com/GirlBossRush/sussudio/tree/main/src'
            }
        }
    });
    return extractorConfig;
}
exports.createAPIExtractorConfig = createAPIExtractorConfig;
async function runAPIExtractor(packageConfig) {
    const subModuleBundleContent = await fs.readFile(packageConfig.distSubmoduleBundlePath);
    const subModuleBundle = JSON.parse(subModuleBundleContent.toString());
    const subModuleCount = subModuleBundle.length;
    console.log(`${subModuleBundle.length} API docs found in ${packageConfig.packageName}...`);
    for (const [index, subModule] of subModuleBundle.entries()) {
        const extractorConfig = createAPIExtractorConfig(subModule, packageConfig);
        console.log(`[${index}/${subModuleCount}]Generating API docs for ${subModule}...`);
        const extractorResult = api_extractor_1.Extractor.invoke(extractorConfig, {
            localBuild: true,
        });
        if (!extractorResult.succeeded) {
            throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors`
                + ` and ${extractorResult.warningCount} warnings`);
        }
    }
}
async function runAPIDocumenter(packageConfig) {
    const apiModel = new api_extractor_model_1.ApiModel();
    // TODO: Fix this.
    // apiModel.loadPackage(packageConfig);
    const markdownDocumenter = new MarkdownDocumenter_1.MarkdownDocumenter({
        apiModel,
        outputFolder: packageConfig.distPathBuilder('docs'),
        documenterConfig: undefined
    });
    markdownDocumenter.generateFiles();
}
async function generateDocs() {
    console.log('Generating Sussudio docs...');
    for (const packageConfig of common_1.packageConfigs) {
        await runAPIExtractor(packageConfig);
        await runAPIDocumenter(packageConfig);
        break;
    }
}
generateDocs().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtZG9jcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdlbmVyYXRlLWRvY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsNERBQXNFO0FBQ3RFLHNHQUFtRztBQUNuRyx3RUFBMEQ7QUFDMUQscUNBQXlEO0FBQ3pELGtDQUFrQztBQUNsQywrQkFBK0M7QUFFL0MsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQUM7QUFDekMsb0VBQW9FO0FBQ3BFLDJCQUEyQjtBQUMxQiwrQkFBdUIsQ0FBQywrQkFBK0IsR0FBRyxrQkFBa0IsQ0FBQztBQUU5RSxtRUFBbUU7QUFDbEUseUJBQWlCLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRTNEOztHQUVHO0FBQ0gsU0FBZ0Isd0JBQXdCLENBQUMsYUFBcUIsRUFBRSxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBaUI7SUFDcE0sTUFBTSxrQkFBa0IsR0FBRyxJQUFBLGNBQU8sRUFBQyxhQUFhLENBQUMsQ0FBQztJQUNsRCxNQUFNLGlCQUFpQixHQUFHLElBQUEsZUFBUSxFQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2xELE1BQU0scUJBQXFCLEdBQUcsSUFBQSxXQUFJLEVBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sYUFBYSxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4RSxNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFaEYsTUFBTSxlQUFlLEdBQUcsK0JBQWUsQ0FBQyxPQUFPLENBQUM7UUFDL0Msb0JBQW9CLEVBQUUsU0FBUztRQUMvQixtQkFBbUIsRUFBRSxtQkFBbUI7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