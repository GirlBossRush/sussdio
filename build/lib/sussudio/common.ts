/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'path';
import { readFileSync } from 'fs';
import type { INodePackageJson } from '@rushstack/node-core-library';
import { ParsedCommandLine } from 'typescript';
import { readParsedTSConfig } from './compiler';
export const copyrightHeaderLines = [
	'/*---------------------------------------------------------------------------------------------',
	' *  Copyright (c) Microsoft Corporation. All rights reserved.',
	' *  Licensed under the MIT License. See License.txt in the project root for license information.',
	' *--------------------------------------------------------------------------------------------*/',
	'\n'
].join('\n');

export const REPO_ROOT = join(__dirname, '../../../');
export const repoRootPathBuilder = join.bind(null, REPO_ROOT);
export const sourceRootPathBuilder = join.bind(null, REPO_ROOT, 'src');
export const sourceRoot = sourceRootPathBuilder();

const SUSSUDIO_OUT_DIR_NAME = 'out-sussudio';
export const distRootPathBuilder = join.bind(null, REPO_ROOT, SUSSUDIO_OUT_DIR_NAME);
export const distRoot = distRootPathBuilder();

export const scopePrefix = '@sussudio';

export interface PackageConfig {
	packageName: string;
	unscopedPackageName: string;
	sourcePackageJsonPath: string;
	distPackageJsonPath: string;
	sourceDirectory: string;
	distDirectory: string;
	distSubmoduleBundlePath: string;
	packageJSON: INodePackageJson;
	tsConfig: ParsedCommandLine;
	sourcePathBuilder: typeof join;
	distPathBuilder: typeof join;
}

const _unscopedPackageNames = ['base', 'platform'];

export const packageConfigs: PackageConfig[] = _unscopedPackageNames.map(unscopedPackageName => {
	const packageName = join(scopePrefix, unscopedPackageName);

	const sourcePathBuilder = join.bind(null, sourceRoot, 'vs', unscopedPackageName);
	const distPathBuilder = join.bind(null, distRoot, unscopedPackageName);

	const sourceDirectory = sourcePathBuilder();
	const distDirectory = distPathBuilder();

	const sourcePackageJsonPath = sourcePathBuilder('package.json');
	const distPackageJsonPath = distPathBuilder('package.json');

	const packageJSON: INodePackageJson = JSON.parse(readFileSync(sourcePackageJsonPath, 'utf8'));
	const tsConfig = readParsedTSConfig(sourcePathBuilder('tsconfig.json'));
	const distSubmoduleBundlePath = distPathBuilder('submodules.bundle.json');

	const packageConfig: PackageConfig = {
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
