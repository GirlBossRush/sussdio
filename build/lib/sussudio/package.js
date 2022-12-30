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
const imports_1 = require("./transformers/imports");
const prettier = require("prettier");
const common_1 = require("./common");
/** File ends with .js or .mjs */
const jsExtensionPattern = /\.m?js$/;
/** File ends with .d.ts or .d.mts */
const tsDeclarationExtensionPattern = /\.d\.m?ts$/;
const SOURCE_ROOT = (0, path_1.join)(__dirname, '../../../', 'src');
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
    const absoluteImporterFilePath = (0, path_1.join)('/', (0, path_1.relative)(SOURCE_ROOT, importerFilePath));
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
    const builtCompilerOptions = {
        module: ts.ModuleKind.NodeNext,
        target: ts.ScriptTarget.ESNext,
        allowJs: true,
    };
    const builtTSConfig = {
        compilerOptions: builtCompilerOptions,
    };
    console.log('Copying package files...');
    await Promise.all([
        fs.cp((0, common_1.sourceRootPathBuilder)('typings'), distPathBuilder('typings'), { 'recursive': true }),
        fs.copyFile(sourcePackageJsonPath, distPackageJsonPath),
        fs.copyFile(sourcePathBuilder('README.md'), distPathBuilder('README.md')),
        fs.copyFile((0, common_1.sourceRootPathBuilder)('..', 'LICENSE.txt'), distPathBuilder('LICENSE.txt')),
        fs.writeFile(distPathBuilder('tsconfig.json'), JSON.stringify(builtTSConfig, null, 2), 'utf8'),
        fs.writeFile(distSubmoduleBundlePath, JSON.stringify(declarations), 'utf8'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhY2thZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHOztBQUVoRyxpQ0FBaUM7QUFDakMsMkJBQWdDO0FBQ2hDLGtDQUFrQztBQUNsQywrQkFBK0M7QUFDL0Msb0RBQStFO0FBQy9FLHFDQUFxQztBQUNyQyxxQ0FBZ0g7QUFFaEgsaUNBQWlDO0FBQ2pDLE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDO0FBQ3JDLHFDQUFxQztBQUNyQyxNQUFNLDZCQUE2QixHQUFHLFlBQVksQ0FBQztBQUduRCxNQUFNLFdBQVcsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBR3hELE1BQU0sWUFBWSxHQUFHO0lBQ3BCLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQztJQUN4QixDQUFDLDhCQUE4QixFQUFFLFFBQVEsQ0FBQztJQUMxQyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQztJQUM3QixDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQztDQUM1QixDQUFDO0FBRVg7Ozs7OztHQU1HO0FBQ0gsU0FBUyxjQUFjLENBQUMsaUJBQXlCLEVBQUUsWUFBb0IsRUFBRSxnQkFBd0I7SUFDaEcsTUFBTSx3QkFBd0IsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9ELE1BQU0sc0JBQXNCLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUU1RCxJQUFJLHdCQUF3QixFQUFFO1FBQzdCLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxZQUFZLEVBQUU7WUFDdEMsSUFBSSxpQkFBaUIsS0FBSyxJQUFJLElBQUksWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDaEUsT0FBTyxZQUFZO3FCQUNqQixPQUFPLENBQUMsSUFBSSxFQUFF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