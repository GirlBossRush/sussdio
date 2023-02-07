/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'path';
import { readFileSync } from 'fs';
import type { IPackageJson } from '@rushstack/node-core-library';
import { ParsedCommandLine } from 'typescript';
import { readParsedTSConfig } from './compiler';
export const copyrightHeaderLines = [
	'/*---------------------------------------------------------------------------------------------',
	' *  Copyright (c) Microsoft Corporation. All rights reserved.',
	' *  Licensed under the MIT License. See License.txt in the project root for license information.',
	' *--------------------------------------------------------------------------------------------*/',
].join('\n');

export const REPO_ROOT = join(__dirname, '../../../');
export const repoRootPathBuilder = join.bind(null, REPO_ROOT);
export const sourceRootPathBuilder = join.bind(null, REPO_ROOT, 'src');
export const sourceRoot = sourceRootPathBuilder();

const SUSSUDIO_OUT_DIR_NAME = 'out-sussudio';
export const distRootPathBuilder = join.bind(null, REPO_ROOT, SUSSUDIO_OUT_DIR_NAME);
export const distRoot = distRootPathBuilder();
export const moduleDeclarationPattern = /\.d\.m?ts$/i;

export interface PackageConfig {
	packageName: string;
	unscopedPackageName: string;
	sourcePackageJsonPath: string;
	distPackageJsonPath: string;
	distDirectory: string;
	distSubmoduleBundlePath: string;
	packageJSON: IPackageJson;
	tsConfig: ParsedCommandLine;
	distPathBuilder: typeof join;
}


const packageName = 'sussudio';

const distPathBuilder = join.bind(null, distRoot);

const distDirectory = distPathBuilder();

const sourcePackageJsonPath = sourceRootPathBuilder('vs', 'package.json');
const distPackageJsonPath = distPathBuilder('package.json');

const packageJSON: IPackageJson = JSON.parse(readFileSync(sourcePackageJsonPath, 'utf8'));
const tsConfig = readParsedTSConfig(sourceRootPathBuilder('tsconfig.sussudio.json'));
const distSubmoduleBundlePath = distPathBuilder('submodules.bundle.json');

export const packageConfig: PackageConfig = {
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


export interface IPackageJsonExportDeclaration {
	import: string;
	require?: string;
	types?: string;
}

export type IPackageJsonExportRecord = Record<string, string | IPackageJsonExportDeclaration>;

export interface IPackageJsonWithExports extends IPackageJson {
	exports?: IPackageJsonExportRecord;
}
