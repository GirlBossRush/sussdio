"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageConfigs = exports.scopePrefix = exports.distRoot = exports.distRootPathBuilder = exports.sourceRoot = exports.sourceRootPathBuilder = exports.repoRootPathBuilder = exports.REPO_ROOT = exports.copyrightHeaderLines = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const compiler_1 = require("./compiler");
exports.copyrightHeaderLines = [
    '/*---------------------------------------------------------------------------------------------',
    ' *  Copyright (c) Microsoft Corporation. All rights reserved.',
    ' *  Licensed under the MIT License. See License.txt in the project root for license information.',
    ' *--------------------------------------------------------------------------------------------*/',
    '\n'
].join('\n');
exports.REPO_ROOT = (0, path_1.join)(__dirname, '../../../');
exports.repoRootPathBuilder = path_1.join.bind(null, exports.REPO_ROOT);
exports.sourceRootPathBuilder = path_1.join.bind(null, exports.REPO_ROOT, 'src');
exports.sourceRoot = (0, exports.sourceRootPathBuilder)();
const SUSSUDIO_OUT_DIR_NAME = 'out-sussudio';
exports.distRootPathBuilder = path_1.join.bind(null, exports.REPO_ROOT, SUSSUDIO_OUT_DIR_NAME);
exports.distRoot = (0, exports.distRootPathBuilder)();
exports.scopePrefix = '@sussudio';
const _unscopedPackageNames = ['base', 'platform'];
exports.packageConfigs = _unscopedPackageNames.map(unscopedPackageName => {
    const packageName = (0, path_1.join)(exports.scopePrefix, unscopedPackageName);
    const sourcePathBuilder = path_1.join.bind(null, exports.sourceRoot, 'vs', unscopedPackageName);
    const distPathBuilder = path_1.join.bind(null, exports.distRoot, unscopedPackageName);
    const sourceDirectory = sourcePathBuilder();
    const distDirectory = distPathBuilder();
    const sourcePackageJsonPath = sourcePathBuilder('package.json');
    const distPackageJsonPath = distPathBuilder('package.json');
    const packageJSON = JSON.parse((0, fs_1.readFileSync)(sourcePackageJsonPath, 'utf8'));
    const tsConfig = (0, compiler_1.readParsedTSConfig)(sourcePathBuilder('tsconfig.json'));
    const distSubmoduleBundlePath = distPathBuilder('submodules.bundle.json');
    const packageConfig = {
        unscopedPackageName,
        packageName,
        packageJSON,
        tsConfig,
        sourcePathBuilder,
        distPathBuilder,
        sourceDirectory,
        distDirectory,
        sourcePackageJsonPath,
        distPackageJsonPath,
        distSubmoduleBundlePath
    };
    return packageConfig;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRzs7O0FBRWhHLCtCQUE0QjtBQUM1QiwyQkFBa0M7QUFHbEMseUNBQWdEO0FBQ25DLFFBQUEsb0JBQW9CLEdBQUc7SUFDbkMsaUdBQWlHO0lBQ2pHLCtEQUErRDtJQUMvRCxrR0FBa0c7SUFDbEcsa0dBQWtHO0lBQ2xHLElBQUk7Q0FDSixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVBLFFBQUEsU0FBUyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUN6QyxRQUFBLG1CQUFtQixHQUFHLFdBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFTLENBQUMsQ0FBQztBQUNqRCxRQUFBLHFCQUFxQixHQUFHLFdBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDMUQsUUFBQSxVQUFVLEdBQUcsSUFBQSw2QkFBcUIsR0FBRSxDQUFDO0FBRWxELE1BQU0scUJBQXFCLEdBQUcsY0FBYyxDQUFDO0FBQ2hDLFFBQUEsbUJBQW1CLEdBQUcsV0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3hFLFFBQUEsUUFBUSxHQUFHLElBQUEsMkJBQW1CLEdBQUUsQ0FBQztBQUVqQyxRQUFBLFdBQVcsR0FBRyxXQUFXLENBQUM7QUFnQnZDLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFFdEMsUUFBQSxjQUFjLEdBQW9CLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO0lBQzlGLE1BQU0sV0FBVyxHQUFHLElBQUEsV0FBSSxFQUFDLG1CQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUUzRCxNQUFNLGlCQUFpQixHQUFHLFdBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFVLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDakYsTUFBTSxlQUFlLEdBQUcsV0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQVEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBRXZFLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixFQUFFLENBQUM7SUFDNUMsTUFBTSxhQUFhLEdBQUcsZUFBZSxFQUFFLENBQUM7SUFFeEMsTUFBTSxxQkFBcUIsR0FBRyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNoRSxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUU1RCxNQUFNLFdBQVcsR0FBcUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFBLGlCQUFZLEVBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM5RixNQUFNLFFBQVEsR0FBRyxJQUFBLDZCQUFrQixFQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDeEUsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUUxRSxNQUFNLGFBQWEsR0FBa0I7UUFDcEMsbUJBQW1CO1FBQ25CLFdBQVc7UUFDWCxXQUFXO1FBQ1gsUUFBUTtRQUNSLGlCQUFpQjtRQUNqQixlQUFlO1FBQ2YsZUFBZTtRQUNmLGFBQWE7UUFDYixxQkFBcUI7UUFDckIsbUJBQW1CO1FBQ25CLHVCQUF1QjtLQUN2QixDQUFDO0lBRUYsT0FBTyxhQUFhLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMifQ==