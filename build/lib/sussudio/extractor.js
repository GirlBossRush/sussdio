"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAPIExtractor = exports.readPackageConfigSubmodules = exports.createAPIExtractorConfig = exports.docModelTempFolder = exports.reportTempFolder = exports.reportFolder = void 0;
require("./monkeypatch");
const api_extractor_1 = require("@microsoft/api-extractor");
const tsdoc_1 = require("@microsoft/tsdoc");
const common_1 = require("./common");
const path_1 = require("path");
const fs_1 = require("fs");
exports.reportFolder = (0, common_1.repoRootPathBuilder)('_api-review');
exports.reportTempFolder = (0, common_1.repoRootPathBuilder)('_api-extractor-temp');
exports.docModelTempFolder = (0, path_1.join)(exports.reportTempFolder, 'doc-models');
const tSDocTagDefinitions = [
    // Fixes many mispellings of @return
    {
        tagName: '@return',
        allowMultiple: true,
        standardization: tsdoc_1.Standardization.Core,
        syntaxKind: tsdoc_1.TSDocTagSyntaxKind.BlockTag,
        tagNameWithUpperCase: '@RETURN'
    },
    // Denotes supported platforms.
    // e.g. @platform darwin,mas
    {
        tagName: '@platform',
        allowMultiple: false,
        standardization: tsdoc_1.Standardization.None,
        syntaxKind: tsdoc_1.TSDocTagSyntaxKind.BlockTag,
        tagNameWithUpperCase: '@PLATFORM'
    },
    // Denotes a declaration as an event listener.
    {
        tagName: '@event',
        allowMultiple: false,
        standardization: tsdoc_1.Standardization.None,
        syntaxKind: tsdoc_1.TSDocTagSyntaxKind.BlockTag,
        tagNameWithUpperCase: '@EVENT'
    },
    // Used to clarify changes made to upstream
    {
        tagName: '@sussudio',
        allowMultiple: false,
        standardization: tsdoc_1.Standardization.None,
        syntaxKind: tsdoc_1.TSDocTagSyntaxKind.BlockTag,
        tagNameWithUpperCase: '@SUSSUDIO'
    },
    // Used to define a module.
    {
        tagName: '@module',
        allowMultiple: false,
        standardization: tsdoc_1.Standardization.None,
        syntaxKind: tsdoc_1.TSDocTagSyntaxKind.BlockTag,
        tagNameWithUpperCase: '@MODULE'
    },
];
/**
 * Creates an API-Extractor config.
 */
function createAPIExtractorConfig(submodulePath, { unscopedPackageName, distPathBuilder, distDirectory, packageJSON, distPackageJsonPath, tsConfig }) {
    const submoduleDirectory = (0, path_1.dirname)(submodulePath);
    const submoduleBaseName = (0, path_1.basename)(submodulePath);
    const absoluteSubmodulePath = (0, path_1.join)(distDirectory, submodulePath);
    const submoduleName = submoduleBaseName.replace(common_1.moduleDeclarationPattern, '');
    const reportFileName = submoduleBaseName.replace(common_1.moduleDeclarationPattern, '.api.md');
    const submodulePackageName = (0, path_1.join)(unscopedPackageName, submoduleDirectory, submoduleName);
    const dotdelimitedPackageName = submodulePackageName.replace(/\//g, '.');
    const projectFolder = (0, path_1.dirname)(absoluteSubmodulePath);
    const extractorConfig = api_extractor_1.ExtractorConfig.prepare({
        configObjectFullPath: undefined,
        packageJsonFullPath: distPackageJsonPath,
        packageJson: {
            ...packageJSON,
            name: dotdelimitedPackageName
        },
        configObject: {
            newlineKind: 'lf',
            bundledPackages: [
                '@sussudio/base/common/lifecycle.mjs'
            ],
            compiler: {
                overrideTsconfig: {
                    ...tsConfig,
                    include: [
                        '**/*.ts',
                        absoluteSubmodulePath,
                        // HACK: Include global typings for the project.
                        distPathBuilder('typings')
                    ],
                },
            },
            projectFolder,
            mainEntryPointFilePath: absoluteSubmodulePath,
            apiReport: {
                enabled: true,
                includeForgottenExports: true,
                reportFolder: (0, path_1.join)(exports.reportFolder, unscopedPackageName, submoduleDirectory),
                reportTempFolder: (0, path_1.join)(exports.reportTempFolder, unscopedPackageName, submoduleDirectory),
                reportFileName,
            },
            docModel: {
                apiJsonFilePath: (0, path_1.join)(exports.docModelTempFolder, `${dotdelimitedPackageName}.api.json`),
                enabled: true,
                includeForgottenExports: true,
                projectFolderUrl: 'https://github.com/sister.software/sussudio/tree/main/src'
            },
        }
    });
    // HACK: Fixes issue where package name parsing prevents submodule paths.
    extractorConfig.packageJson.name = submodulePackageName + '.mjs';
    // console.log('>>>', extractorConfig.packageJson!.name);
    extractorConfig.tsdocConfiguration.addTagDefinitions(tSDocTagDefinitions, true);
    return extractorConfig;
}
exports.createAPIExtractorConfig = createAPIExtractorConfig;
function readPackageConfigSubmodules(packageConfig) {
    const subModuleBundleContent = (0, fs_1.readFileSync)(packageConfig.distSubmoduleBundlePath);
    const subModuleBundle = JSON.parse(subModuleBundleContent.toString());
    const subModuleExtractorConfigs = new Map(subModuleBundle.map(subModule => {
        return [subModule, createAPIExtractorConfig(subModule, packageConfig)];
    }));
    return subModuleExtractorConfigs;
}
exports.readPackageConfigSubmodules = readPackageConfigSubmodules;
async function runAPIExtractor(subModuleExtractorConfigs) {
    const subModuleCount = subModuleExtractorConfigs.size;
    let moduleIndex = 1;
    for (const [subModule, extractorConfig] of subModuleExtractorConfigs) {
        console.log(`[${moduleIndex}/${subModuleCount}] Extracting API for ${subModule}...`);
        const reportDirectories = [
            (0, path_1.dirname)(extractorConfig.reportFilePath),
            (0, path_1.dirname)(extractorConfig.reportTempFilePath)
        ];
        reportDirectories.forEach(dir => {
            if (!(0, fs_1.existsSync)(dir)) {
                (0, fs_1.mkdirSync)(dir, { recursive: true });
            }
        });
        // TODO: Consider running this in parallel.
        const extractorResult = api_extractor_1.Extractor.invoke(extractorConfig, {
            localBuild: process.env.NODE_ENV !== 'production' && !!process.env.CI
        });
        if (!extractorResult.succeeded) {
            throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors`
                + ` and ${extractorResult.warningCount} warnings`);
        }
        moduleIndex += 1;
    }
}
exports.runAPIExtractor = runAPIExtractor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXh0cmFjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRzs7O0FBRWhHLHlCQUF1QjtBQUV2Qiw0REFBc0U7QUFDdEUsNENBQTJGO0FBQzNGLHFDQUF3RjtBQUN4RiwrQkFBK0M7QUFDL0MsMkJBQXlEO0FBRTVDLFFBQUEsWUFBWSxHQUFHLElBQUEsNEJBQW1CLEVBQUMsYUFBYSxDQUFDLENBQUM7QUFDbEQsUUFBQSxnQkFBZ0IsR0FBRyxJQUFBLDRCQUFtQixFQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDOUQsUUFBQSxrQkFBa0IsR0FBRyxJQUFBLFdBQUksRUFBQyx3QkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUV2RSxNQUFNLG1CQUFtQixHQUFrQztJQUMxRCxvQ0FBb0M7SUFDcEM7UUFDQyxPQUFPLEVBQUUsU0FBUztRQUNsQixhQUFhLEVBQUUsSUFBSTtRQUNuQixlQUFlLEVBQUUsdUJBQWUsQ0FBQyxJQUFJO1FBQ3JDLFVBQVUsRUFBRSwwQkFBa0IsQ0FBQyxRQUFRO1FBQ3ZDLG9CQUFvQixFQUFFLFNBQVM7S0FDL0I7SUFDRCwrQkFBK0I7SUFDL0IsNEJBQTRCO0lBQzVCO1FBQ0MsT0FBTyxFQUFFLFdBQVc7UUFDcEIsYUFBYSxFQUFFLEtBQUs7UUFDcEIsZUFBZSxFQUFFLHVCQUFlLENBQUMsSUFBSTtRQUNyQyxVQUFVLEVBQUUsMEJBQWtCLENBQUMsUUFBUTtRQUN2QyxvQkFBb0IsRUFBRSxXQUFXO0tBQ2pDO0lBQ0QsOENBQThDO0lBQzlDO1FBQ0MsT0FBTyxFQUFFLFFBQVE7UUFDakIsYUFBYSxFQUFFLEtBQUs7UUFDcEIsZUFBZSxFQUFFLHVCQUFlLENBQUMsSUFBSTtRQUNyQyxVQUFVLEVBQUUsMEJBQWtCLENBQUMsUUFBUTtRQUN2QyxvQkFBb0IsRUFBRSxRQUFRO0tBQzlCO0lBQ0QsMkNBQTJDO0lBQzNDO1FBQ0MsT0FBTyxFQUFF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