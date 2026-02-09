export const installing = `
# Using npm
npm install --save-dev babylonjs-editor-cli

# Using yarn
yarn add -D babylonjs-editor-cli

# Using pnpm
pnpm add -D babylonjs-editor-cli

# Using bun
bun add -d babylonjs-editor-cli
`;

export const packageJson = `
{
  "scripts": {
    ...
    "generate": "babylonjs-editor-cli pack"
    ...
  }
}
`;

export const pack = `
babylonjs-editor-cli pack
`;

export const ciExample = `
# Clone the repository
git clone ...

# Do custom things

cd path/to/your/project

# Do custom things

npm i

# Equivalent to babylonjs-editor-cli pack
# It is important to run this command before running \`npm run build\`
npm run generate

npm run build

...
`;
