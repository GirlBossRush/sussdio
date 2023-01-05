"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const fs_1 = require("fs");
const fs = require("fs/promises");
const path_1 = require("path");
const imports_1 = require("../transformers/imports");
const prettier = require("prettier");
const common_1 = require("../common");
/** File ends with .js or .mjs */
const jsExtensionPattern = /\.m?js$/;
/** File ends with .d.ts or .d.mts */
const tsDeclarationExtensionPattern = /\.d\.m?ts$/;
const pathRewrites = [
    ['vs/nls', 'vscode-nls'],
    ['vs/base/common/marked/marked', 'marked'],
    ['vs/base', '@sussudio/base'],
    ['vs/platform', '@sussudio/platform'],
];
/**
 * Rewrites imports to be compatible with ES modules.
 *
 * @param parentPackageName The name of the package that is doing importing.
 * @param importedPath The path that is being imported.
 * @param importerFilePath The path of the file that is doing the importing.
 */
function rewriteImports(parentPackageName, importedPath, importerFilePath) {
    const importedPathUsesVSPrefix = importedPath.startsWith('vs');
    const importedPathIsRelative = importedPath.startsWith('.');
    if (importedPathUsesVSPrefix) {
        for (const [from, to] of pathRewrites) {
            if (parentPackageName !== from && importedPath.startsWith(from)) {
                return importedPath
                    .replace(from, to);
            }
        }
    }
    if (importedPathUsesVSPrefix || importedPathIsRelative) {
        // First, rewrite the path to be compatible with ES modules.
        if (tsDeclarationExtensionPattern.test(importedPath)) {
            importedPath = importedPath.replace('.d.ts', '.d.mts');
        }
        else if (jsExtensionPattern.test(importedPath)) {
            importedPath = importedPath.replace('.js', '.mjs');
        }
        else if (importedPath.includes('css!')) {
            // Rewrite to direct CSS import.
            importedPath = importedPath.replace('css!', '') + '.css';
        }
        else {
            // Add the .mjs extension if it's missing for browser compatiblity.
            importedPath = importedPath + '.mjs';
        }
    }
    if (!importedPathUsesVSPrefix) {
        return importedPath;
    }
    // Make the path absolute to the source root.
    importedPath = importedPath.replace('vs/', '/vs/');
    const absoluteImporterFilePath = (0, path_1.join)('/', (0, path_1.relative)(common_1.sourceRoot, importerFilePath));
    // Then, make the path relative.
    const relativePath = (0, path_1.relative)((0, path_1.dirname)(absoluteImporterFilePath), importedPath);
    // Finally, make sure the path is relative.
    return relativePath.startsWith('.') ? relativePath : './' + relativePath;
}
async function compilePackage({ unscopedPackageName, packageName, sourcePackageJsonPath, sourcePathBuilder, distPathBuilder, distSubmoduleBundlePath, distPackageJsonPath, tsConfig, distDirectory }) {
    console.log(`Compiling package ${packageName}...`);
    await fs.mkdir(distDirectory, { recursive: true });
    const program = ts.createProgram({
        host: ts.createCompilerHost(tsConfig.options, true),
        options: tsConfig.options,
        rootNames: tsConfig.fileNames,
    });
    const declarations = [];
    const writeFileCallback = (fileName, fileContents, writeByteOrderMark) => {
        const fileIsInPackage = fileName.includes(unscopedPackageName);
        const fileIsDeclaration = tsDeclarationExtensionPattern.test(fileName);
        const fileIsJS = jsExtensionPattern.test(fileName);
        const fileIsFormattable = fileIsJS || fileIsDeclaration;
        // Don't emit files not in package. This prevents clobbering of other packages.
        if (!fileIsInPackage) {
            return;
        }
        if (fileIsDeclaration) {
            if (fileContents.length === 0) {
                // Don't emit empty declaration files.
                // This prevents API Extractor from parsing them.
                return;
            }
            const relativePath = (0, path_1.relative)(common_1.distRoot, fileName);
            declarations.push(relativePath
                .replace(unscopedPackageName + '/', './')
                .replace('.d.ts', '.d.mts'));
            fileContents = [
                // Add copywrite header to generated definitions.
                common_1.copyrightHeaderLines,
                fileContents,
            ].join('\n');
            fileName = fileName.replace('.d.ts', '.d.mts');
        }
        if (fileName.endsWith('.js')) {
            // Add the .mjs extension if it's missing for browser compatiblity.
            fileName = fileName.replace('.js', '.mjs');
        }
        if (fileIsFormattable) {
            fileContents = prettier.format(fileContents, {
                parser: 'typescript',
                singleQuote: true,
                trailingComma: 'all',
                printWidth: 120,
                semi: true,
                useTabs: true,
            });
        }
        ts.sys.writeFile(fileName, fileContents, writeByteOrderMark);
    };
    const transformOpts = {
        rewrite: rewriteImports.bind(null, `vs/${unscopedPackageName}`),
    };
    const customTransformers = {
        after: [
            (0, imports_1.tsPathTransform)(transformOpts)
        ],
        afterDeclarations: [
            (0, imports_1.tsPathTransform)(transformOpts)
        ]
    };
    const emitResult = program.emit(undefined, writeFileCallback, undefined, undefined, customTransformers);
    const allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        }
        else {
            console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    });
    console.log('Creating package index...');
    const indexStub = [
        common_1.copyrightHeaderLines,
        'export default {};'
    ];
    const indexDeclaration = [
        common_1.copyrightHeaderLines,
        ...declarations.map(declaration => {
            return `/// <reference path="${declaration}" />`;
        }),
        '\n',
        `declare module "${packageName}" {`,
        '	const _defaultStub: any;',
        '	export default _defaultStub;',
        '}'
    ];
    console.log('Copying package files...');
    await Promise.all([
        // Include global types in every package...
        fs.cp((0, common_1.sourceRootPathBuilder)('typings'), distPathBuilder('typings'), { 'recursive': true }),
        // Package.json for Node compatibility...
        fs.copyFile(sourcePackageJsonPath, distPackageJsonPath),
        // Readme...
        fs.copyFile(sourcePathBuilder('README.md'), distPathBuilder('README.md')),
        // All packages use the same license...
        fs.copyFile((0, common_1.sourceRootPathBuilder)('..', 'LICENSE.txt'), distPathBuilder('LICENSE.txt')),
        // Include a tsconfig ready for use in the final output for API doc generation...
        fs.copyFile(sourcePathBuilder('tsconfig.dist.json'), distPathBuilder('tsconfig.json')),
        // Submodule declarations for later API doc generation...
        fs.writeFile(distSubmoduleBundlePath, JSON.stringify(declarations), 'utf8'),
        // Index files...
        fs.writeFile(distPathBuilder('index.js'), indexStub.join('\n'), 'utf8'),
        fs.writeFile(distPathBuilder('index.d.ts'), indexDeclaration.join('\n'), 'utf8'),
    ]);
}
async function build() {
    const outDir = common_1.distRoot;
    if ((0, fs_1.existsSync)(outDir)) {
        console.log('Cleaning', outDir);
        await fs.rm(outDir, { recursive: true });
    }
    await fs.mkdir(outDir);
    console.log('Building Sussudio...');
    for (const packageConfig of common_1.packageConfigs) {
        await compilePackage(packageConfig);
    }
    console.log('Copying static files...');
}
build().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhY2thZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHOztBQUVoRyxpQ0FBaUM7QUFDakMsMkJBQWdDO0FBQ2hDLGtDQUFrQztBQUNsQywrQkFBK0M7QUFDL0MscURBQWdGO0FBQ2hGLHFDQUFxQztBQUNyQyxzQ0FBNkg7QUFFN0gsaUNBQWlDO0FBQ2pDLE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDO0FBQ3JDLHFDQUFxQztBQUNyQyxNQUFNLDZCQUE2QixHQUFHLFlBQVksQ0FBQztBQUVuRCxNQUFNLFlBQVksR0FBRztJQUNwQixDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUM7SUFDeEIsQ0FBQyw4QkFBOEIsRUFBRSxRQUFRLENBQUM7SUFDMUMsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUM7SUFDN0IsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLENBQUM7Q0FDNUIsQ0FBQztBQUVYOzs7Ozs7R0FNRztBQUNILFNBQVMsY0FBYyxDQUFDLGlCQUF5QixFQUFFLFlBQW9CLEVBQUUsZ0JBQXdCO0lBQ2hHLE1BQU0sd0JBQXdCLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvRCxNQUFNLHNCQUFzQixHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFNUQsSUFBSSx3QkFBd0IsRUFBRTtRQUM3QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksWUFBWSxFQUFFO1lBQ3RDLElBQUksaUJBQWlCLEtBQUssSUFBSSxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hFLE9BQU8sWUFBWTtxQkFDakIsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQzthQUNwQjtTQUNEO0tBQ0Q7SUFFRCxJQUFJLHdCQUF3QixJQUFJLHNCQUFzQixFQUFFO1FBQ3ZE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