// Stub for missing GDJS extensions
// This allows the editor to load even when some extension files are not built yet.
// Once the import-GDJS-Runtime.js script runs properly, the real extensions will be used.

export const registerEditorConfigurations = () => {};
export const registerInstanceRenderers = () => {};
export const registerClearCache = () => {};
export const extension = {
  fullName: 'Missing Extension',
  shortDescription: 'Extension stub - run import-GDJS-Runtime.js to build',
  name: 'MissingExtension',
  helpPagePath: '',
  description: 'This is a stub for a missing extension.',
  author: '',
  url: '',
  license: '',
  version: '0.0.0',
  sdkVersion: '',
  previewIcon: '',
  tags: [],
  category: '',
  owner: '',
  namespace: '',
  eventsFunctions: [],
  expressions: [],
  dependencies: [],
};

export default {
  extension,
  registerEditorConfigurations: () => {},
  registerInstanceRenderers: () => {},
  registerClearCache: () => {},
};
