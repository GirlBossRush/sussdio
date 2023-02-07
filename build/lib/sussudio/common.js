"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageConfig = exports.moduleDeclarationPattern = exports.distRoot = exports.distRootPathBuilder = exports.sourceRoot = exports.sourceRootPathBuilder = exports.repoRootPathBuilder = exports.REPO_ROOT = exports.copyrightHeaderLines = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const compiler_1 = require("./compiler");
exports.copyrightHeaderLines = [
    '/*---------------------------------------------------------------------------------------------',
    ' *  Copyright (c) Microsoft Corporation. All rights reserved.',
    ' *  Licensed under the MIT License. See License.txt in the project root for license information.',
    ' *--------------------------------------------------------------------------------------------*/',
].join('\n');
exports.REPO_ROOT = (0, path_1.join)(__dirname, '../../../');
exports.repoRootPathBuilder = path_1.join.bind(null, exports.REPO_ROOT);
exports.sourceRootPathBuilder = path_1.join.bind(null, exports.REPO_ROOT, 'src');
exports.sourceRoot = (0, exports.sourceRootPathBuilder)();
const SUSSUDIO_OUT_DIR_NAME = 'out-sussudio';
exports.distRootPathBuilder = path_1.join.bind(null, exports.REPO_ROOT, SUSSUDIO_OUT_DIR_NAME);
exports.distRoot = (0, exports.distRootPathBuilder)();
exports.moduleDeclarationPattern = /\.d\.m?ts$/i;
const packageName = 'sussudio';
const distPathBuilder = path_1.join.bind(null, exports.distRoot);
const distDirectory = distPathBuilder();
const sourcePackageJsonPath = (0, exports.sourceRootPathBuilder)('vs', 'package.json');
const distPackageJsonPath = distPathBuilder('package.json');
const packageJSON = JSON.parse((0, fs_1.readFileSync)(sourcePackageJsonPath, 'utf8'));
const tsConfig = (0, compiler_1.readParsedTSConfig)((0, exports.sourceRootPathBuilder)('tsconfig.sussudio.json'));
const distSubmoduleBundlePath = distPathBuilder('submodules.bundle.json');
exports.packageConfig = {
    unscopedPackageName: packageName,
    packageName,
    packageJSON,
    tsConfig,
    distPathBuilder,
    distDirectory,
    sourcePackageJsonPath,
    distPackageJsonPath,
    distSubmoduleBundlePath
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRzs7O0FBRWhHLCtCQUE0QjtBQUM1QiwyQkFBa0M7QUFHbEMseUNBQWdEO0FBQ25DLFFBQUEsb0JBQW9CLEdBQUc7SUFDbkMsaUdBQWlHO0lBQ2pHLCtEQUErRDtJQUMvRCxrR0FBa0c7SUFDbEcsa0dBQWtHO0NBQ2xHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRUEsUUFBQSxTQUFTLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ3pDLFFBQUEsbUJBQW1CLEdBQUcsV0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQVMsQ0FBQyxDQUFDO0FBQ2pELFFBQUEscUJBQXFCLEdBQUcsV0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMxRCxRQUFBLFVBQVUsR0FBRyxJQUFBLDZCQUFxQixHQUFFLENBQUM7QUFFbEQsTUFBTSxxQkFBcUIsR0FBRyxjQUFjLENBQUM7QUFDaEMsUUFBQSxtQkFBbUIsR0FBRyxXQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFDeEUsUUFBQSxRQUFRLEdBQUcsSUFBQSwyQkFBbUIsR0FBRSxDQUFDO0FBQ2pDLFFBQUEsd0JBQXdCLEdBQUcsYUFBYSxDQUFDO0FBZXRELE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQztBQUUvQixNQUFNLGVBQWUsR0FBRyxXQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBUSxDQUFDLENBQUM7QUFFbEQsTUFBTSxhQUFhLEdBQUcsZUFBZSxFQUFFLENBQUM7QUFFeEMsTUFBTSxxQkFBcUIsR0FBRyxJQUFBLDZCQUFxQixFQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUMxRSxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUU1RCxNQUFNLFdBQVcsR0FBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFBLGlCQUFZLEVBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUMxRixNQUFNLFFBQVEsR0FBRyxJQUFBLDZCQUFrQixFQUFDLElBQUEsNkJBQXFCLEVBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO0FBQ3JGLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFFN0QsUUFBQSxhQUFhLEdBQWtCO0lBQzNDLG1CQUFtQixFQUFFLFdBQVc7SUFDaEMsV0FBVztJQUNYLFdBQVc7SUFDWCxRQUFRO0lBQ1IsZUFBZTtJQUNmLGFBQWE7SUFDYixxQkFBcUI7SUFDckIsbUJBQW1CO0lBQ25CLHVCQUF1QjtDQUN2QixDQUFDIn0=