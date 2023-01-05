"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAPIExtractor = exports.readPackageConfigSubmodules = exports.createAPIExtractorConfig = exports.docModelTempFolder = exports.reportTempFolder = exports.reportFolder = void 0;
const api_extractor_1 = require("@microsoft/api-extractor");
const PackageName_1 = require("@rushstack/node-core-library/lib/PackageName");
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const tsdoc_1 = require("@microsoft/tsdoc");
const common_1 = require("./common");
const path_1 = require("path");
const fs_1 = require("fs");
exports.reportFolder = (0, common_1.repoRootPathBuilder)('_api-review');
exports.reportTempFolder = (0, common_1.repoRootPathBuilder)('_api-extractor-temp');
exports.docModelTempFolder = (0, path_1.join)(exports.reportTempFolder, 'doc-models');
const declarationPattern = /\.d\.m?ts$/i;
// HACK: Gets around the fact that the API Extractor doesn't support
// ESM module declarations.
api_extractor_1.ExtractorConfig._declarationFileExtensionRegExp = declarationPattern;
// HACK: VS Code's TypeScript version is too new for API Extractor.
api_extractor_1.Extractor._checkCompilerCompatibility = () => { };
// HACK: Fixes issue where package name parsing prevents submodule paths.
DeclarationReference_1.ModuleSource._fromPackageName = function (parsed, packageName, importPath) {
    if (!parsed) {
        throw new Error('Parsed package must be provided.');
    }
    let path = packageName;
    if (importPath) {
        path += '/' + importPath;
        parsed.importPath = importPath;
    }
    const source = new DeclarationReference_1.ModuleSource(path);
    source._pathComponents = parsed;
    return source;
};
// HACK: Fixes issue where package name parsing prevents submodule paths.
PackageName_1.PackageNameParser.prototype.parse = function (packageName) {
    const result = this.tryParse(packageName);
    if (result.error && !result.error.includes('invalid character')) {
        throw new Error(result.error);
    }
    result.error = '';
    return result;
};
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
];
/**
 * Creates an API-Extractor config.
 */
function createAPIExtractorConfig(submodulePath, { unscopedPackageName, distPathBuilder, distDirectory, packageJSON, distPackageJsonPath, tsConfig }) {
    const submoduleDirectory = (0, path_1.dirname)(submodulePath);
    const submoduleBaseName = (0, path_1.basename)(submodulePath);
    const absoluteSubmodulePath = (0, path_1.join)(distDirectory, submodulePath);
    const submoduleName = submoduleBaseName.replace(declarationPattern, '');
    const reportFileName = submoduleBaseName.replace(declarationPattern, '.api.md');
    const submodulePackageName = (0, path_1.join)(unscopedPackageName, submoduleDirectory, submoduleName);
    const dotdelimitedPackageName = submodulePackageName.replace(/\//g, '.');
    const extractorConfig = api_extractor_1.ExtractorConfig.prepare({
        configObjectFullPath: undefined,
        packageJsonFullPath: distPackageJsonPath,
        packageJson: {
            ...packageJSON,
            name: (0, path_1.join)(common_1.scopePrefix, dotdelimitedPackageName)
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
                reportFolder: (0, path_1.join)(exports.reportFolder, unscopedPackageName, submoduleDirectory),
                reportTempFolder: (0, path_1.join)(exports.reportTempFolder, unscopedPackageName, submoduleDirectory),
                reportFileName,
            },
            docModel: {
                apiJsonFilePath: (0, path_1.join)(exports.docModelTempFolder, `${dotdelimitedPackageName}.api.json`),
                enabled: true,
                includeForgottenExports: true,
                projectFolderUrl: 'https://github.com/GirlBossRush/sussudio/tree/main/src'
            },
        }
    });
    extractorConfig.packageJson.name = (0, path_1.join)(common_1.scopePrefix, submodulePackageName);
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
            localBuild: true,
        });
        if (!extractorResult.succeeded) {
            throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors`
                + ` and ${extractorResult.warningCount} warnings`);
        }
        moduleIndex += 1;
    }
}
exports.runAPIExtractor = runAPIExtractor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXh0cmFjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRzs7O0FBRWhHLDREQUFzRTtBQUN0RSw4RUFBaUY7QUFDakYsa0dBQXVGO0FBQ3ZGLDRDQUEyRjtBQUMzRixxQ0FBMkU7QUFDM0UsK0JBQStDO0FBQy9DLDJCQUF5RDtBQUU1QyxRQUFBLFlBQVksR0FBRyxJQUFBLDRCQUFtQixFQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ2xELFFBQUEsZ0JBQWdCLEdBQUcsSUFBQSw0QkFBbUIsRUFBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQzlELFFBQUEsa0JBQWtCLEdBQUcsSUFBQSxXQUFJLEVBQUMsd0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFFdkUsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQUM7QUFDekMsb0VBQW9FO0FBQ3BFLDJCQUEyQjtBQUMxQiwrQkFBdUIsQ0FBQywrQkFBK0IsR0FBRyxrQkFBa0IsQ0FBQztBQUU5RSxtRUFBbUU7QUFDbEUseUJBQWlCLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBUzNELHlFQUF5RTtBQUN4RSxtQ0FBb0IsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLE1BQXFCLEVBQUUsV0FBbUIsRUFBRSxVQUFtQjtJQUNqSCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0tBQ3BEO0lBRUQsSUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDO0lBRXZCLElBQUksVUFBVSxFQUFFO1FBQ2YsSUFBSSxJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUM7UUFDekIsTUFBTSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7S0FDL0I7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLG1DQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsTUFBYyxDQUFDLGVB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