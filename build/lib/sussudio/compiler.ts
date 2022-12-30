/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

const configHostParser: ts.ParseConfigHost = {
	fileExists: existsSync,
	readDirectory: ts.sys.readDirectory,
	readFile: file => readFileSync(file, 'utf8'),
	useCaseSensitiveFileNames: process.platform === 'linux'
};

/**
 * Reads a tsconfig.json file and returns the parsed result.
 */
export function readParsedTSConfig(pathToTSConfig: string): ts.ParsedCommandLine {
	const tsConfig = ts.readConfigFile(pathToTSConfig, ts.sys.readFile);

	return ts.parseJsonConfigFileContent(
		tsConfig.config,
		configHostParser,
		resolve(dirname(pathToTSConfig))
	);
}
