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
const common_1 = require("../common");
/** File ends with .js or .mjs */
const jsExtensionPattern = /\.m?js$/;
/** File ends with .d.ts or .d.mts */
const tsDeclarationExtensionPattern = /\.d\.m?ts$/;
const declarePattern = /declare\s+(module|enum|type|interface|abstract|class|namespace|function|const|let)\s+/g;
const pathRewrites = [
    ['vs/nls', 'vscode-nls'],
    ['vs/base/common/marked/marked', 'marked'],
];
const JS_IMPORT_PREFIX = 'vs';
const CSS_IMPORT_PREFIX = 'vs/css!';
const prettierOptions = {
    parser: 'typescript',
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 120,
    semi: true,
    useTabs: true,
};
function normalizeExtension(filePath) {
    // First, rewrite the path to be compatible with ES modules.
    if (tsDeclarationExtensionPattern.test(filePath)) {
        return filePath.replace('.d.ts', '.d.mts');
    }
    else if (jsExtensionPattern.test(filePath)) {
        return filePath.replace('.js', '.mjs');
    }
    else if (!filePath.endsWith('css')) {
        // Add the .mjs extension if it's missing for browser compatiblity.
        return filePath + '.mjs';
    }
    return filePath;
}
/**
 * Rewrites imports to be compatible with ES modules.
 *
 * @param importedPath The path that is being imported.
 * @param importerFilePath The path of the file that is doing the importing.
 */
function rewriteImports(importedPath, importerFilePath) {
    if (importedPath.startsWith(CSS_IMPORT_PREFIX)) {
        // We need to rewrite relative CSS imports to be relative to the root of the package.
        // e.g. `vs/css!./foo` -> `/vs/${parentPackageName}/absolute/path/to/foo.css`
        // First, remove the CSS loader prefix.
        const relativeCSSImport = importedPath.slice(CSS_IMPORT_PREFIX.length) + '.css';
        // Convert back to 'vs' prefix, relative to the root of the package.
        importedPath = (0, path_1.resolve)((0, path_1.join)('/', (0, path_1.dirname)(importerFilePath.slice(common_1.sourceRoot.length))), relativeCSSImport)
            .slice(1);
    }
    if (importedPath.startsWith(JS_IMPORT_PREFIX)) {
        for (const [from, to] of pathRewrites) {
            if (importedPath.startsWith(from)) {
                return importedPath.replace(from, to);
            }
        }
    }
    if (importedPath.startsWith('.')) {
        const baseDir = (0, path_1.dirname)(importerFilePath).slice(common_1.sourceRoot.length + 1);
        importedPath = (0, path_1.join)(baseDir, importedPath);
    }
    // This is a bare import, e.g. `import 'vscode'`.
    if (importedPath.includes('vs/')) {
        return normalizeExtension(importedPath)
            .replace('/vs/', 'sussudio/')
            .replace('vs/', 'sussudio/');
    }
    return importedPath;
}
const transformOpts = {
    rewrite: rewriteImports
};
const customTransformers = {
    after: [
        (0, imports_1.tsPathTransform)(transformOpts),
    ],
    afterDeclarations: [
        (0, imports_1.tsPathTransform)(transformOpts),
    ],
};
function createJSDocHeader(moduleName, version) {
    return [
        '/**',
        ` * @module ${moduleName}`,
        ' * @packageDocumentation',
        ` * @version ${version}`,
        ' *',
        ' * @file This auto-generated file is a part of the Sussudio project, an unofficial internal API for VS Code.',
        ' * @license MIT',
        ' * @copyright (c) Microsoft Corporation. All rights reserved.',
        ' */',
        ''
    ].join('\n');
}
async function compilePackage({ unscopedPackageName, packageName, packageJSON, distPathBuilder, distSubmoduleBundlePath, distPackageJsonPath, tsConfig, distDirectory }) {
    await fs.mkdir(distDirectory, { recursive: true });
    const program = ts.createProgram({
        host: ts.createCompilerHost(tsConfig.options, true),
        options: tsConfig.options,
        rootNames: tsConfig.fileNames,
    });
    console.log(`Checking ${program.getSourceFiles().length} files...`);
    logDiagnostics(ts.getPreEmitDiagnostics(program), 'Premitted');
    const declarations = [];
    const writeFileCallback = (fileName, fileContents, writeByteOrderMark) => {
        const fileIsDeclaration = tsDeclarationExtensionPattern.test(fileName);
        // Don't emit empty declaration files. This prevents API Extractor from parsing them.
        if (fileIsDeclaration && fileContents.length === 0) {
            return;
        }
        // Remove the 'vs' prefix from the file name.
        fileName = fileName.replace((0, path_1.join)(distDirectory, 'vs'), distDirectory);
        const fileIsJS = jsExtensionPattern.test(fileName);
        const fileIsFormattable = fileIsJS || fileIsDeclaration;
        const relativePath = (0, path_1.relative)(common_1.distRoot, fileName);
        const moduleName = (0, path_1.join)(unscopedPackageName, relativePath)
            .replace(jsExtensionPattern, '.mjs')
            .replace(tsDeclarationExtensionPattern, '.mjs');
        const fileHeader = createJSDocHeader(moduleName, packageJSON.version);
        // Remove the default copyright header.
        if (fileContents.startsWith(common_1.copyrightHeaderLines)) {
            fileContents = fileContents.slice(common_1.copyrightHeaderLines.length);
        }
        // We need to include an index reference comment in JS files to
        // ensure that module resolution works correctly.
        const relativeIndexPath = (0, path_1.relative)((0, path_1.dirname)(fileName), (0, path_1.join)(common_1.distRoot, 'index.d.ts'));
        const indexReferenceComment = `/// <reference path="${relativeIndexPath}" />\n`;
        if (fileIsJS) {
            fileContents = fileHeader + indexReferenceComment + fileContents;
            // Add the .mjs extension if it's missing for browser compatiblity.
            fileName = fileName.replace('.js', '.mjs');
        }
        else if (fileIsDeclaration) {
            declarations.push(('./' + relativePath)
                .replace('.d.ts', '.d.mts'));
            fileContents = [
                fileHeader,
                indexReferenceComment,
                `declare module "${moduleName}" {`,
                // Anything matching `declare enum`, `declare type` should be removed.
                fileContents.replace(declarePattern, '$1 '),
                '}'
            ].join('\n');
            fileName = fileName.replace('.d.ts', '.d.mts');
        }
        // if (fileIsFormattable) {
        // 	fileContents = prettier.format(fileContents, prettierOptions);
        // }
        ts.sys.writeFile(fileName, fileContents, writeByteOrderMark);
    };
    console.log('Emitting files...');
    const emitResult = program.emit(undefined, writeFileCallback, undefined, undefined, customTransformers);
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
        `declare module '${packageName}' {`,
        '	const _defaultStub: any;',
        '	export default _defaultStub;',
        '}'
    ];
    const exportDeclarations = {
        '.': {
            'import': './index.js',
            'types': './index.d.ts',
        },
        './package.json': {
            import: './package.json',
            require: './package.json'
        },
    };
    // Sort alphabetically to ensure consistent output.
    declarations.sort((a, b) => a.localeCompare(b));
    for (const declaration of declarations) {
        const declarationImport = declaration.replace('.d.mts', '.mjs');
        exportDeclarations[declarationImport] = {
            'import': declarationImport,
            'types': declaration,
        };
    }
    const builtPackageJSON = {
        ...packageJSON,
        exports: exportDeclarations
    };
    const typingsDirectory = distPathBuilder('typings');
    await fs.mkdir(typingsDirectory, { 'recursive': true });
    console.log('Copying package files...');
    await Promise.all([
        // Include global types in every package...
        fs.cp((0, common_1.sourceRootPathBuilder)('typings'), distPathBuilder('typings'), { 'recursive': true }),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/monaco.d.ts'), distPathBuilder('typings', 'monaco.d.ts')),
        fs.cp((0, common_1.sourceRootPathBuilder)('vscode-dts'), distPathBuilder('vscode-dts'), { 'recursive': true }),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/loader.js'), distPathBuilder('loader.js')),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/loader.d.ts'), distPathBuilder('loader.d.ts')),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/workbench/contrib/debug/common/debugProtocol.d.ts'), distPathBuilder('typings', 'debugProtocol.d.ts')),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/base/node/languagePacks.js'), distPathBuilder('base/node/languagePacks.mjs')),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/base/node/languagePacks.d.ts'), distPathBuilder('base/node/languagePacks.d.mts')),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/base/common/performance.d.ts'), distPathBuilder('base/common/performance.d.mts')),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/base/common/performance.js'), distPathBuilder('base/common/performance.mjs')),
        fs.cp((0, common_1.sourceRootPathBuilder)('vs/workbench/contrib/terminal/browser/xterm-private.d.ts'), distPathBuilder('workbench/contrib/terminal/browser/xterm-private.d.mts')),
        // Package.json for Node compatibility...
        fs.writeFile(distPackageJsonPath, JSON.stringify(builtPackageJSON, null, 2), 'utf8'),
        // Readme...
        fs.copyFile((0, common_1.sourceRootPathBuilder)('..', 'README.md'), distPathBuilder('README.md')),
        // All packages use the same license...
        fs.copyFile((0, common_1.sourceRootPathBuilder)('..', 'LICENSE.txt'), distPathBuilder('LICENSE.txt')),
        // Include a tsconfig ready for use in the final output for API doc generation...
        fs.copyFile((0, common_1.sourceRootPathBuilder)('tsconfig.sussudio-dist.json'), distPathBuilder('tsconfig.json')),
        fs.copyFile((0, common_1.sourceRootPathBuilder)('tsconfig.sussudio-dist.json'), distPathBuilder('jsconfig.json')),
        // Submodule declarations for later API doc generation...
        fs.writeFile(distSubmoduleBundlePath, JSON.stringify(declarations, null, 2), 'utf8'),
        // Index files...
        fs.writeFile(distPathBuilder('index.js'), indexStub.join('\n'), 'utf8'),
        fs.writeFile(distPathBuilder('index.d.ts'), indexDeclaration.join('\n'), 'utf8'),
    ]);
    return emitResult;
}
function logDiagnostics(diagnostics, logLabel) {
    if (diagnostics.length === 0) {
        return;
    }
    console.log(`${diagnostics.length} ${logLabel} diagnostic(s)`);
    for (const diagnostic of diagnostics) {
        if (diagnostic.file) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        }
        else {
            console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    }
}
async function build() {
    const outDir = common_1.distRoot;
    if ((0, fs_1.existsSync)(outDir)) {
        console.log('Cleaning', outDir);
        await fs.rm(outDir, { recursive: true });
    }
    await fs.mkdir(outDir);
    console.log('Building Sussudio...');
    const emitResult = await compilePackage(common_1.packageConfig);
    logDiagnostics(emitResult.diagnostics, 'Emitted');
    console.log('Copying static files...');
}
build().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhY2thZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHOztBQUVoRyxpQ0FBaUM7QUFDakMsMkJBQWdDO0FBQ2hDLGtDQUFrQztBQUNsQywrQkFBd0Q7QUFDeEQscURBQWdGO0FBRWhGLHNDQUErSztBQUUvSyxpQ0FBaUM7QUFDakMsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUM7QUFDckMscUNBQXFDO0FBQ3JDLE1BQU0sNkJBQTZCLEdBQUcsWUFBWSxDQUFDO0FBQ25ELE1BQU0sY0FBYyxHQUFHLHdGQUF3RixDQUFDO0FBRWhILE1BQU0sWUFBWSxHQUFHO0lBQ3BCLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQztJQUN4QixDQUFDLDhCQUE4QixFQUFFLFFBQVEsQ0FBQztDQUNqQyxDQUFDO0FBRVgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7QUFDOUIsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUM7QUFFcEMsTUFBTSxlQUFlLEdBQXFCO0lBQ3pDLE1BQU0sRUFBRSxZQUFZO0lBQ3BCLFdBQVcsRUFBRSxJQUFJO0lBQ2pCLGFBQWEsRUFBRSxLQUFLO0lBQ3BCLFVBQVUsRUFBRSxHQUFHO0lBQ2YsSUFBSSxFQUFFLElBQUk7SUFDVixPQUFPLEVBQUUsSUFBSTtDQUNiLENBQUM7QUFFRixTQUFTLGtCQUFrQixDQUFDLFFBQWdCO0lBQzNDLDREQUE0RDtJQUM1RCxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNqRCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQzNDO1NBQU0sSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDN0MsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztLQUN2QztTQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3JDLG1FQUFtRTtRQUNuRSxPQUFPLFFBQVEsR0FBRyxNQUFNLENBQUM7S0FDekI7SUFFRCxPQUFPLFFBQVEsQ0FBQztBQUNqQixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGNBQWMsQ0FBQyxZQUFvQixFQUFFLGdCQUF3QjtJQUNyRSxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRTtRQUMvQyxxRkFBcUY7UUFDckYsNkVBQTZFO1FBQzdFLHVDQUF1QztRQUN2QyxNQUFNLGlCQUFpQixHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBR2hGLG9FQUFvRTtRQUNwRSxZQUFZLEdBQUcsSUFBQSxjQUFPLEVBQ3JCLElBQUEsV0FBSSxFQUFDLEdBQUcsRUFBRSxJQUFBLGNBQU8sRUFBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsbUJBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQzdELGlCQUFpQixDQUFDO2FBQ2pCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNYO0lBRUQsSUFBSSxZQUFZLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7UUFDOUMsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFlBQVksRUFBRTtZQUN0QyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBRWxDLE9BQU8sWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDdEM7U0FDRDtLQUNEO0lBQ0QsSUFBSSxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2pDLE1BQU0sT0FBTyxHQUFHLElBQUEsY0FBTyxFQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxDQUFDLG1CQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLFlBQVksR0FBRyxJQUFBLFdBQUksRUFBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7S0FDM0M7SUFJRCxpREFBaUQ7SUFDakQsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ2pDLE9BQU8sa0JBQWtCLENBQUMsWUFBWSxDQUFDO2FBQ3JDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDO2FBQzVCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7S0FDOUI7SUFHRCxPQUFPLFlBQVksQ0FBQztBQUNyQixDQUFDO0FBRUQsTUFBTSxhQUFhLEdBQXlCO0lBQzNDLE9BQU8sRUFBRSxjQUFjO0NBQ3ZCLENBQUM7QUFFRixNQUFNLGtCQUFrQixHQUEwQjtJQUNqRCxLQUFLLEVBQUU7UUFDTixJQUFBLHlCQUFlLEVBQUMsYUFBYSxDQUFDO0tBQzlCO0lBQ0QsaUJBQWlCLEVBQUU7UUFDbEIsSUFBQSx5QkFBZSxFQUFDLGFBQWEsQ0FBQztLQUM5QjtDQUNELENBQUM7QUFFRixTQUFTLGlCQUFpQixDQUFDLFVBQWtCLEVBQUUsT0FBZTtJQUM3RCxPQUFPO1FBQ04sS0FBSztRQUNMLGNBQWMsVUFBVSxFQUFFO1FBQzFCLDBCQUEwQjtRQUMxQixlQUFlLE9BQU8sRUFBRTtRQUN4QixJQUFJO1FBQ0osOEdBQThHO1FBQzlHLGlCQUFpQjtRQUNqQiwrREFBK0Q7UUFDL0QsS0FBSztRQUNMLEVBQUU7S0FDRixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNkLENBQUM7QUFJRCxLQUFLLFVBQVUsY0FBYyxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBaUI7SUFDckwsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRW5ELE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUM7UUFDaEMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQztRQUNuRCxPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87UUFDekIsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTO0tBQzdCLENBQUMsQ0FBQztJQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxXQUFXLENBQUMsQ0FBQztJQUVwRSxjQUFjLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRS9ELE1BQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQztJQUVsQyxNQUFNLGlCQUFpQixHQUF5QixDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsRUFBRTtRQUM5RixNQUFNLGlCQUFpQixHQUFHLDZCQUE2QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RSxxRkFBcUY7UUFDckYsSUFBSSxpQkFBaUIsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNuRCxPQUFPO1NBQ1A7UUFFRCw2Q0FBNkM7UUFDN0MsUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBQSxXQUFJLEVBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRXRFLE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsSUFBSSxpQkFBaUIsQ0FBQztRQUV4RCxNQUFNLFlBQVksR0FBRyxJQUFBLGVBQVEsRUFBQyxpQkFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sVUFBVSxHQUFHLElBQUEsV0FBSSxFQUFDLG1CQUFtQixFQUFFLFlBQVksQ0FBQzthQUN4RCxPQUFPLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDO2FBQ25DLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNqRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXRFLHVDQUF1QztRQUN2QyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsNkJBQW9CLENBQUMsRUFBRTtZQUNsRCxZQUFZLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyw2QkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUMvRDtRQUVELCtEQUErRDtRQUMvRCxpREFBaUQ7UUFDakQsTUFBTSxpQkFBaUIsR0FBRyxJQUFBLGVBQVEsRUFBQyxJQUFBLGNBQU8sRUFBQyxRQUFRLENBQUMsRUFBRSxJQUFBLFdBQUksRUFBQyxpQkFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFcEYsTUFBTSxxQkFBcUIsR0FBRyx3QkFBd0IsaUJBQWlCLFFBQVEsQ0FBQztRQUVoRixJQUFJLFFBQVEsRUFBRTtZQUNiLFlBQVksR0FBRyxVQUFVLEdBQUcscUJBQXFCLEdBQUcsWUFBWSxDQUFDO1lBQ2pFLG1FQUFtRTtZQUNuRSxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDM0M7YUFBTSxJQUFJLGlCQUFpQixFQUFFO1lBQzdCLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO2lCQUNyQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFFOUIsWUFBWSxHQUFHO2dCQUNkLFVBQVU7Z0JBQ1YscUJBQXFCO2dCQUNyQixtQkFBbUIsVUFBVSxLQUFLO2dCQUNsQyxzRUFBc0U7Z0JBQ3RFLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQztnQkFDM0MsR0FBRzthQUNILENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWIsUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsMkJBQTJCO1FBQzNCLGtFQUFrRTtRQUNsRSxJQUFJO1FBRUosRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQzlELENBQUMsQ0FBQztJQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNqQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFHeEcsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBRXpDLE1BQU0sU0FBUyxHQUFHO1FBQ2pCLDZCQUFvQjtRQUNwQixvQkFBb0I7S0FDcEIsQ0FBQztJQUVGLE1BQU0sZ0JBQWdCLEdBQUc7UUFDeEIsNkJBQW9CO1FBQ3BCLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNqQyxPQUFPLHdCQUF3QixXQUFXLE1BQU0sQ0FBQztRQUNsRCxDQUFDLENBQUM7UUFDRixJQUFJO1FBQ0osbUJBQW1CLFdBQVcsS0FBSztRQUNuQywyQkFBMkI7UUFDM0IsK0JBQStCO1FBQy9CLEdBQUc7S0FDSCxDQUFDO0lBRUYsTUFBTSxrQkFBa0IsR0FBNkI7UUFDcEQsR0FBRyxFQUFFO1lBQ0osUUFBUSxFQUFFLFlBQVk7WUFDdEIsT0FBTyxFQUFFLGNBQWM7U0FDdkI7UUFDRCxnQkFBZ0IsRUFBRTtZQUNqQixNQUFNLEVBQUUsZ0JBQWdCO1lBQ3hCLE9BQU8sRUFBRSxnQkFBZ0I7U0FDekI7S0FDRCxDQUFDO0lBRUYsbURBQW1EO0lBQ25ELFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFaEQsS0FBSyxNQUFNLFdBQVcsSUFBSSxZQUFZLEVBQUU7UUFDdkMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVoRSxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHO1lBQ3ZDLFFBQVEsRUFBRSxpQkFBaUI7WUFDM0IsT0FBTyxFQUFFLFdBQVc7U0FDcEIsQ0FBQztLQUNGO0lBRUQsTUFBTSxnQkFBZ0IsR0FBNEI7UUFDakQsR0FBRyxXQUFXO1FBQ2QsT0FBTyxFQUFFLGtCQUFrQjtLQUMzQixDQUFDO0lBRUYsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFcEQsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFFeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBRXhDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUNqQiwyQ0FBMkM7UUFDM0MsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFBLDhCQUFxQixFQUFDLFNBQVMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUMxRixFQUFFLENBQUMsRUFBRSxDQUFDLElBQUEsOEJBQXFCLEVBQUMsZ0JBQWdCLENBQUMsRUFBRSxlQUFlLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3pGLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBQSw4QkFBcUIsRUFBQyxZQUFZLENBQUMsRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDaEcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFBLDhCQUFxQixFQUFDLGNBQWMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMxRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUEsOEJBQXFCLEVBQUMsZ0JBQWdCLENBQUMsRUFBRSxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDOUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFBLDhCQUFxQixFQUFDLHNEQUFzRCxDQUFDLEVBQUUsZUFBZSxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3RJLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBQSw4QkFBcUIsRUFBQywrQkFBK0IsQ0FBQyxFQUFFLGVBQWUsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzdHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBQSw4QkFBcUIsRUFBQyxpQ0FBaUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ2pILEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBQSw4QkFBcUIsRUFBQyxpQ0FBaUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ2pILEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBQSw4QkFBcUIsRUFBQywrQkFBK0IsQ0FBQyxFQUFFLGVBQWUsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzdHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBQSw4QkFBcUIsRUFBQywwREFBMEQsQ0FBQyxFQUFFLGVBQWUsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO1FBQ25LLHlDQUF5QztRQUN6QyxFQUFFLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztRQUNwRixZQUFZO1FBQ1osRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFBLDhCQUFxQixFQUFDLElBQUksRUFBRSxXQUFXLENBQUMsRUFBRSxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkYsdUNBQXVDO1FBQ3ZDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBQSw4QkFBcUIsRUFBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLEVBQUUsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZGLGlGQUFpRjtRQUNqRixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUEsOEJBQXFCLEVBQUMsNkJBQTZCLENBQUMsRUFBRSxlQUFlLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbkcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFBLDhCQUFxQixFQUFDLDZCQUE2QixDQUFDLEVBQUUsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ25HLHlEQUF5RDtRQUN6RCxFQUFFLENBQUMsU0FBUyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7UUFDcEYsaUJBQWlCO1FBQ2pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDO1FBQ3ZFLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUM7S0FDaEYsQ0FBQyxDQUFDO0lBR0gsT0FBTyxVQUFVLENBQUM7QUFDbkIsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLFdBQXFDLEVBQUUsUUFBZ0I7SUFDOUUsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUM3QixPQUFPO0tBQ1A7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sSUFBSSxRQUFRLGdCQUFnQixDQUFDLENBQUM7SUFFL0QsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7UUFDckMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxVQUFVLENBQUMsS0FBTSxDQUFDLENBQUM7WUFDN0YsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksR0FBRyxDQUFDLElBQUksU0FBUyxHQUFHLENBQUMsTUFBTSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1NBQ3hGO2FBQU07WUFDTixPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDN0U7S0FDRDtBQUNGLENBQUM7QUFHRCxLQUFLLFVBQVUsS0FBSztJQUNuQixNQUFNLE1BQU0sR0FBRyxpQkFBUSxDQUFDO0lBRXhCLElBQUksSUFBQSxlQUFVLEVBQUMsTUFBTSxDQUFDLEVBQUU7UUFDdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQ3pDO0lBRUQsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBR3ZCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUVwQyxNQUFNLFVBQVUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxzQkFBYSxDQUFDLENBQUM7SUFFdkQsY0FBYyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDIn0=