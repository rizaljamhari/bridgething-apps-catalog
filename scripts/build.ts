#!/usr/bin/env bun
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertCatalog } from "../src/catalog.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(root, "catalog.v1.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as unknown;
assertCatalog(catalog);

const dist = resolve(root, "dist");
mkdirSync(dist, { recursive: true });
copyFileSync(catalogPath, resolve(dist, "catalog.v1.json"));
copyFileSync(
  resolve(root, "schema", "catalog.v1.schema.json"),
  resolve(dist, "catalog.v1.schema.json"),
);
copyFileSync(resolve(root, "icon.svg"), resolve(dist, "icon.svg"));
writeFileSync(resolve(dist, ".nojekyll"), "");
writeFileSync(
  resolve(dist, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>BridgeThing Apps Catalog</title>
    <style>
      body { max-width: 42rem; margin: 4rem auto; padding: 0 1.25rem; font: 1rem/1.6 system-ui, sans-serif; }
      code { overflow-wrap: anywhere; }
    </style>
  </head>
  <body>
    <main>
      <h1>BridgeThing Apps Catalog</h1>
      <p>Open-source desk apps distributed through a federated BridgeThing catalog.</p>
      <p><a href="./catalog.v1.json">Open <code>catalog.v1.json</code></a></p>
    </main>
  </body>
</html>
`,
);

console.log(
  `built static catalog with ${catalog.apps.length} app${catalog.apps.length === 1 ? "" : "s"}`,
);
