#!/usr/bin/env bun
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCatalog,
  type Catalog,
  type CatalogApp,
} from "../src/catalog.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(root, "catalog.v1.json");
const catalogValue = JSON.parse(readFileSync(catalogPath, "utf8")) as unknown;
assertCatalog(catalogValue);
const catalog: Catalog = catalogValue;

const dist = resolve(root, "dist");
mkdirSync(dist, { recursive: true });
copyFileSync(catalogPath, resolve(dist, "catalog.v1.json"));
copyFileSync(
  resolve(root, "schema", "catalog.v1.schema.json"),
  resolve(dist, "catalog.v1.schema.json"),
);
copyFileSync(resolve(root, "icon.svg"), resolve(dist, "icon.svg"));
writeFileSync(resolve(dist, ".nojekyll"), "");

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(bytes < 1_000_000 ? 2 : 1)} MB`;
}

function appCard(app: CatalogApp): string {
  const latest = app.versions[0];
  if (!latest) throw new Error(`${app.name} has no versions.`);
  const permissions = latest.permissions
    .map(
      (permission) =>
        `<span class="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold tracking-wide text-slate-300">${escapeHtml(permission)}</span>`,
    )
    .join("");
  const minimumVersion = latest.min_libbridgething_version
    ? `<span class="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold tracking-wide text-slate-300">LIB ${escapeHtml(latest.min_libbridgething_version)}+</span>`
    : "";

  return `
    <article class="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
      <div class="flex items-start gap-4">
        <img class="size-16 shrink-0 rounded-2xl bg-slate-800 object-cover" src="${escapeHtml(app.icon)}" alt="" />
        <div class="min-w-0">
          <h2 class="truncate text-2xl font-bold text-white">${escapeHtml(app.name)}</h2>
          <p class="mt-1 text-sm text-slate-400">v${escapeHtml(latest.version)} · ${formatDate(latest.released_at)}</p>
        </div>
      </div>
      <p class="mt-6 text-base leading-7 text-slate-300">${escapeHtml(app.description)}</p>
      <div class="mt-5 flex flex-wrap gap-2">${permissions}${minimumVersion}</div>
      <p class="mt-6 text-sm leading-6 text-slate-400">${escapeHtml(latest.changelog ?? "Latest verified release.")}</p>
      <div class="mt-auto grid grid-cols-1 gap-3 pt-7 sm:grid-cols-2">
        <a class="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-200" href="${escapeHtml(latest.download.url)}">Download ZIP <span class="ml-2 font-medium">${formatBytes(latest.download.size)}</span></a>
        <a class="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-600 px-4 text-sm font-bold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 focus:outline-2 focus:outline-offset-2 focus:outline-slate-200" href="${escapeHtml(app.source)}">View source</a>
      </div>
    </article>
  `;
}

const appCards = catalog.apps.map(appCard).join("");
writeFileSync(
  resolve(dist, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="description" content="${escapeHtml(catalog.repo.description)}">
    <title>${escapeHtml(catalog.repo.name)}</title>
    <link rel="icon" href="./icon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body class="min-h-screen bg-slate-950 text-slate-100">
    <main class="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-12">
      <header class="flex flex-wrap items-center justify-between gap-5">
        <a class="flex items-center gap-3" href="${escapeHtml(catalog.repo.homepage)}">
          <img class="size-10 rounded-xl" src="./icon.svg" alt="" />
          <span>
            <span class="block text-xl font-bold tracking-tight text-white">${escapeHtml(catalog.repo.name)}</span>
            <span class="block text-sm text-slate-400">${escapeHtml(catalog.repo.description)}</span>
          </span>
        </a>
        <a class="inline-flex min-h-10 items-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 focus:outline-2 focus:outline-offset-2 focus:outline-slate-200" href="./catalog.v1.json">Catalog JSON</a>
      </header>

      <section class="max-w-3xl py-18 sm:py-24">
        <p class="text-sm font-bold tracking-[0.18em] text-emerald-300">OPEN-SOURCE APP DIRECTORY</p>
        <h1 class="mt-5 text-5xl font-bold tracking-tight text-white sm:text-6xl">Find an app for your desk.</h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Download a verified BridgeThing app, then install its versioned ZIP from your device.</p>
        <p class="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300">${catalog.apps.length} ${catalog.apps.length === 1 ? "app" : "apps"} available</p>
      </section>

      <section aria-label="Available apps" class="grid gap-6 lg:grid-cols-2">
        ${appCards}
      </section>

      <section class="mt-12 border-t border-slate-800 py-10 sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div>
          <h2 class="text-xl font-bold text-white">Install with confidence</h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Every download links to a versioned ZIP whose size and SHA-256 checksum are recorded in this catalog.</p>
        </div>
        <a class="mt-5 inline-flex min-h-10 items-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 focus:outline-2 focus:outline-offset-2 focus:outline-slate-200 sm:mt-0" href="./catalog.v1.json">Open catalog JSON</a>
      </section>
    </main>
  </body>
</html>
`,
);

console.log(
  `built static catalog with ${catalog.apps.length} app${catalog.apps.length === 1 ? "" : "s"}`,
);
