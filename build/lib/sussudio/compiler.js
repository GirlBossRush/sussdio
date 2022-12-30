"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.readParsedTSConfig = void 0;
const ts = require("typescript");
const fs_1 = require("fs");
const path_1 = require("path");
const configHostParser = {
    fileExists: fs_1.existsSync,
    readDirectory: ts.sys.readDirectory,
    readFile: file => (0, fs_1.readFileSync)(file, 'utf8'),
    useCaseSensitiveFileNames: process.platform === 'linux'
};
/**
 * Reads a tsconfig.json file and returns the parsed result.
 */
function readParsedTSConfig(pathToTSConfig) {
    const tsConfig = ts.readConfigFile(pathToTSConfig, ts.sys.readFile);
    return ts.parseJsonConfigFileContent(tsConfig.config, configHostParser, (0, path_1.resolve)((0, path_1.dirname)(pathToTSConfig)));
}
exports.readParsedTSConfig = readParsedTSConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7OztBQUVoRyxpQ0FBaUM7QUFDakMsMkJBQThDO0FBQzlDLCtCQUF3QztBQUV4QyxNQUFNLGdCQUFnQixHQUF1QjtJQUM1QyxVQUFVLEVBQUUsZUFBVTtJQUN0QixhQUFhLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxhQUFhO0lBQ25DLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUEsaUJBQVksRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQzVDLHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTztDQUN2RCxDQUFDO0FBRUY7O0dBRUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxjQUFzQjtJQUN4RCxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXBFLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUNuQyxRQUFRLENBQUMsTUFBTSxFQUNmLGdCQUFnQixFQUNoQixJQUFBLGNBQU8sRUFBQyxJQUFBLGNBQU8sRUFBQyxjQUFjLENBQUMsQ0FBQyxDQUNoQyxDQUFDO0FBQ0gsQ0FBQztBQVJELGdEQVFDIn0=