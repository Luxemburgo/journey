import createExample from "./createExample.js";

const minimalExampleFiles = [
    "minimal/src/pages/index.js",
    "minimal/mod.ts"
  ];

export default async () => {
    await createExample(minimalExampleFiles);
}