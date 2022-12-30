# Sussudio

🎶 _There's a feature that's been on my mind._
🎵 _All the time, Sus-Sussudio, oh-oh~_

Sussudio brings the internal API of VS Code to your apps. _No Compilation Required._

## Usage

Sussudio is available on NPM:

```sh
yarn add sussudio
# or
npm install sussudio
```

You can also use it in the browser via [esm.sh](https://esm.sh):

```html
<script type="module">
	import * as sussudio from "https://esm.sh/sussudio";
</script>
```

Sussudio is ES6 module, and tree-shakeable, allowing you to import only the parts you need.

## Modules

Much like VS Code, Sussudio is organized into [layers](https://github.com/microsoft/vscode-wiki/blob/main/Source-Code-Organization.md).

### `sussudio/base`

```ts
import { arrays } from "sussudio/arrays";
```

> Provides general utilities and user interface building blocks that can be used in any other layer.

#### `sussudio/base/common`

- `arrays.ts` - Array utilities
- `async.ts` - Async utilities

### `sussudio/platform`

> Defines service injection support and the base services for VS Code that are shared across layers such as workbench and code. Should not include editor or workbench specific services or code.

## Contributing

There are many ways in which you can participate in this project, for example:

- [Submit bugs and feature requests](https://github.com/microsoft/vscode/issues), and help us verify as they are checked in
- Review [source code changes](https://github.com/microsoft/vscode/pulls)
- Review the [documentation](https://github.com/microsoft/vscode-docs) and make pull requests for anything from typos to additional and new content

If you are interested in fixing issues and contributing directly to the code base,
please see the document [How to Contribute](https://github.com/microsoft/vscode/wiki/How-to-Contribute), which covers the following:

- [How to build and run from source](https://github.com/microsoft/vscode/wiki/How-to-Contribute)
- [The development workflow, including debugging and running tests](https://github.com/microsoft/vscode/wiki/How-to-Contribute#debugging)
- [Coding guidelines](https://github.com/microsoft/vscode/wiki/Coding-Guidelines)
- [Submitting pull requests](https://github.com/microsoft/vscode/wiki/How-to-Contribute#pull-requests)
- [Finding an issue to work on](https://github.com/microsoft/vscode/wiki/How-to-Contribute#where-to-contribute)
- [Contributing to translations](https://aka.ms/vscodeloc)

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.
