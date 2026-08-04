const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[0-9a-f]{64}$/;

export type Catalog = {
  schema: "catalog.v1";
  updated_at: string;
  repo: CatalogRepository;
  apps: CatalogApp[];
  recommended_sources: unknown[];
};

export type CatalogRepository = {
  name: string;
  description: string;
  homepage: string;
  icon: string;
};

export type CatalogApp = {
  id: string;
  name: string;
  description: string;
  author: string;
  icon: string;
  homepage: string;
  source: string;
  versions: CatalogVersion[];
};

export type CatalogVersion = {
  version: string;
  released_at: string;
  download: {
    url: string;
    size: number;
    sha256: string;
  };
  permissions: string[];
  role?: "launcher";
  provides_overlay?: boolean;
  min_libbridgething_version?: string;
  changelog?: string;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateCatalog(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const issue = (path: string, message: string) =>
    issues.push({ path, message });

  if (!isRecord(value))
    return [{ path: "$", message: "catalog must be an object" }];
  if (value.schema !== "catalog.v1") issue("schema", 'must equal "catalog.v1"');
  if (!isIsoDate(value.updated_at))
    issue("updated_at", "must be an ISO-8601 timestamp");

  if (!isRecord(value.repo)) {
    issue("repo", "must be an object");
  } else {
    if (!isNonEmptyString(value.repo.name)) issue("repo.name", "is required");
    if (!isNonEmptyString(value.repo.description))
      issue("repo.description", "is required");
    if (!isHttpsUrl(value.repo.homepage))
      issue("repo.homepage", "must be an HTTPS URL without credentials");
    if (!isHttpsUrl(value.repo.icon)) {
      issue("repo.icon", "must be an HTTPS URL without credentials");
    }
  }

  if (!Array.isArray(value.recommended_sources)) {
    issue("recommended_sources", "must be an array");
  }
  if (!Array.isArray(value.apps)) {
    issue("apps", "must be an array");
    return issues;
  }

  const appIds = new Set<string>();
  const appNames = new Set<string>();
  const catalogUpdatedAt = isIsoDate(value.updated_at)
    ? Date.parse(value.updated_at)
    : Number.NaN;

  value.apps.forEach((candidate, appIndex) => {
    const path = `apps[${appIndex}]`;
    if (!isRecord(candidate)) {
      issue(path, "must be an object");
      return;
    }

    if (!isNonEmptyString(candidate.id) || !UUID_V7.test(candidate.id)) {
      issue(`${path}.id`, "must be a UUIDv7");
    } else if (appIds.has(candidate.id)) {
      issue(`${path}.id`, "must be unique");
    } else {
      appIds.add(candidate.id);
    }

    if (!isNonEmptyString(candidate.name)) {
      issue(`${path}.name`, "is required");
    } else {
      const normalizedName = candidate.name.trim().toLocaleLowerCase("en-US");
      if (appNames.has(normalizedName))
        issue(`${path}.name`, "must be unique ignoring case");
      appNames.add(normalizedName);
    }

    for (const field of ["description", "author"] as const) {
      if (!isNonEmptyString(candidate[field]))
        issue(`${path}.${field}`, "is required");
    }
    for (const field of ["icon", "homepage", "source"] as const) {
      if (!isHttpsUrl(candidate[field]))
        issue(`${path}.${field}`, "must be an HTTPS URL without credentials");
    }

    if (!Array.isArray(candidate.versions) || candidate.versions.length === 0) {
      issue(`${path}.versions`, "must contain at least one version");
      return;
    }

    const versions = new Set<string>();
    let previousRelease = Number.POSITIVE_INFINITY;
    candidate.versions.forEach((versionCandidate, versionIndex) => {
      const versionPath = `${path}.versions[${versionIndex}]`;
      if (!isRecord(versionCandidate)) {
        issue(versionPath, "must be an object");
        return;
      }

      if (
        !isNonEmptyString(versionCandidate.version) ||
        !SEMVER.test(versionCandidate.version)
      ) {
        issue(`${versionPath}.version`, "must use semantic versioning");
      } else if (versions.has(versionCandidate.version)) {
        issue(`${versionPath}.version`, "must be unique within the app");
      } else {
        versions.add(versionCandidate.version);
      }

      if (!isIsoDate(versionCandidate.released_at)) {
        issue(`${versionPath}.released_at`, "must be an ISO-8601 timestamp");
      } else {
        const releasedAt = Date.parse(versionCandidate.released_at);
        if (releasedAt > previousRelease)
          issue(`${versionPath}.released_at`, "versions must be newest-first");
        if (
          Number.isFinite(catalogUpdatedAt) &&
          releasedAt > catalogUpdatedAt
        ) {
          issue(
            `${versionPath}.released_at`,
            "cannot be later than catalog updated_at",
          );
        }
        previousRelease = releasedAt;
      }

      if (!isRecord(versionCandidate.download)) {
        issue(`${versionPath}.download`, "must be an object");
      } else {
        if (!isHttpsUrl(versionCandidate.download.url)) {
          issue(
            `${versionPath}.download.url`,
            "must be an HTTPS URL without credentials",
          );
        }
        if (
          !Number.isSafeInteger(versionCandidate.download.size) ||
          Number(versionCandidate.download.size) <= 0
        ) {
          issue(
            `${versionPath}.download.size`,
            "must be a positive integer byte size",
          );
        }
        if (
          typeof versionCandidate.download.sha256 !== "string" ||
          !SHA256.test(versionCandidate.download.sha256)
        ) {
          issue(
            `${versionPath}.download.sha256`,
            "must be a lowercase 64-character SHA-256",
          );
        }
      }

      if (!Array.isArray(versionCandidate.permissions)) {
        issue(`${versionPath}.permissions`, "must be an array");
      } else {
        const permissions = new Set<string>();
        versionCandidate.permissions.forEach((permission, permissionIndex) => {
          if (!isNonEmptyString(permission)) {
            issue(
              `${versionPath}.permissions[${permissionIndex}]`,
              "must be a non-empty string",
            );
          } else if (permissions.has(permission)) {
            issue(
              `${versionPath}.permissions[${permissionIndex}]`,
              "must be unique",
            );
          } else {
            permissions.add(permission);
          }
        });
      }

      if (
        versionCandidate.role !== undefined &&
        versionCandidate.role !== "launcher"
      ) {
        issue(`${versionPath}.role`, 'must equal "launcher" when present');
      }
      if (
        versionCandidate.provides_overlay !== undefined &&
        typeof versionCandidate.provides_overlay !== "boolean"
      ) {
        issue(`${versionPath}.provides_overlay`, "must be a boolean");
      }
      if (
        versionCandidate.min_libbridgething_version !== undefined &&
        (typeof versionCandidate.min_libbridgething_version !== "string" ||
          !SEMVER.test(versionCandidate.min_libbridgething_version))
      ) {
        issue(
          `${versionPath}.min_libbridgething_version`,
          "must use semantic versioning",
        );
      }
      if (
        versionCandidate.changelog !== undefined &&
        typeof versionCandidate.changelog !== "string"
      ) {
        issue(`${versionPath}.changelog`, "must be a string");
      }
    });
  });

  return issues;
}

export function assertCatalog(value: unknown): asserts value is Catalog {
  const issues = validateCatalog(value);
  if (issues.length === 0) return;
  throw new Error(
    issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
  );
}
