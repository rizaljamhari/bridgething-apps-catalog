import { describe, expect, it } from "vitest";
import { validateCatalog } from "./catalog.ts";

const emptyCatalog = {
  schema: "catalog.v1",
  updated_at: "2026-08-04T00:00:00Z",
  repo: {
    name: "BridgeThing Apps",
    description: "Desk apps.",
    homepage: "https://example.com/catalog",
  },
  apps: [],
  recommended_sources: [],
};

describe("validateCatalog", () => {
  it("accepts an empty catalog", () => {
    expect(validateCatalog(emptyCatalog)).toEqual([]);
  });

  it("rejects duplicate app identities", () => {
    const app = {
      id: "019fcbab-0368-725a-baf1-99acae702958",
      name: "Example",
      description: "Example app.",
      author: "Author",
      icon: "https://example.com/icon.svg",
      homepage: "https://example.com",
      source: "https://github.com/example/app",
      versions: [
        {
          version: "0.1.0",
          released_at: "2026-08-03T00:00:00Z",
          download: {
            url: "https://github.com/example/app/releases/download/v0.1.0/app.zip",
            size: 123,
            sha256: "a".repeat(64),
          },
          permissions: ["net.fetch"],
        },
      ],
    };
    const issues = validateCatalog({ ...emptyCatalog, apps: [app, app] });
    expect(issues).toContainEqual({
      path: "apps[1].id",
      message: "must be unique",
    });
    expect(issues).toContainEqual({
      path: "apps[1].name",
      message: "must be unique ignoring case",
    });
  });

  it("rejects mutable or unverifiable downloads", () => {
    const issues = validateCatalog({
      ...emptyCatalog,
      apps: [
        {
          id: "019fcbab-0368-725a-baf1-99acae702958",
          name: "Example",
          description: "Example app.",
          author: "Author",
          icon: "https://example.com/icon.svg",
          homepage: "https://example.com",
          source: "https://github.com/example/app",
          versions: [
            {
              version: "0.1.0",
              released_at: "2026-08-03T00:00:00Z",
              download: {
                url: "http://example.com/latest.zip",
                size: 0,
                sha256: "unknown",
              },
              permissions: [],
            },
          ],
        },
      ],
    });
    expect(issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        "apps[0].versions[0].download.url",
        "apps[0].versions[0].download.size",
        "apps[0].versions[0].download.sha256",
      ]),
    );
  });
});
