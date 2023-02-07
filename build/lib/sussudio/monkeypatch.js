"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const api_extractor_1 = require("@microsoft/api-extractor");
const PackageName_1 = require("@rushstack/node-core-library/lib/PackageName");
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const common_1 = require("./common");
// HACK: Gets around the fact that the API Extractor doesn't support
// ESM module declarations.
api_extractor_1.ExtractorConfig._declarationFileExtensionRegExp = common_1.moduleDeclarationPattern;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ua2V5cGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtb25rZXlwYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7O0FBRWhHLDREQUFzRTtBQUN0RSw4RUFBaUY7QUFDakYsa0dBQXVGO0FBQ3ZGLHFDQUFvRDtBQUVwRCxvRUFBb0U7QUFDcEUsMkJBQTJCO0FBQzFCLCtCQUF1QixDQUFDLCtCQUErQixHQUFHLGlDQUF3QixDQUFDO0FBRXBGLG1FQUFtRTtBQUNsRSx5QkFBaUIsQ0FBQywyQkFBMkIsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFTM0QseUVBQXlFO0FBQ3hFLG1DQUFvQixDQUFDLGdCQUFnQixHQUFHLFVBQVUsTUFBcUIsRUFBRSxXQUFtQixFQUFFLFVBQW1CO0lBQ2pILElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDWixNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7S0FDcEQ7SUFFRCxJQUFJLElBQUksR0FBRyxXQUFXLENBQUM7SUFFdkIsSUFBSSxVQUFVLEVBQUU7UUFDZixJQUFJLElBQUksR0FBRyxHQUFHLFVBQVUsQ0FBQztRQUN6QixNQUFNLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztLQUMvQjtJQUVELE1BQU0sTUFBTSxHQUFHLElBQUksbUNBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxNQUFjLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQztJQUN6QyxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMsQ0FBQztBQUVGLHlFQUF5RTtBQUN6RSwrQkFBaUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFVBQVUsV0FBbUI7SUFDaEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUUxQyxJQUFJLE1BQU0sQ0FBQyxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO1FBQ2hFLE1BQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQzlCO0lBQ0QsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7SUFFbEIsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDLENBQUMifQ==