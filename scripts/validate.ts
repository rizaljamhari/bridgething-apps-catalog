#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalog } from "../src/catalog.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(
  readFileSync(resolve(root, "catalog.v1.json"), "utf8"),
) as unknown;
const issues = validateCatalog(catalog);

if (issues.length > 0) {
  console.error("catalog validation failed:");
  for (const issue of issues)
    console.error(`- ${issue.path}: ${issue.message}`);
  process.exit(1);
}

const appCount = (catalog as { apps: unknown[] }).apps.length;
console.log(`catalog is valid: ${appCount} app${appCount === 1 ? "" : "s"}`);
