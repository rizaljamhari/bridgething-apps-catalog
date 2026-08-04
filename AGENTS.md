# Working on the BridgeThing apps catalog

This repository publishes metadata, not application source.

- Keep `catalog.v1.json` valid against the documented BridgeThing `catalog.v1`
  shape and the stricter local validator.
- Never change an app UUID after its first release.
- Point downloads only at immutable HTTPS release artifacts.
- Verify size and SHA-256 from the actual downloadable ZIP.
- Keep versions newest-first by `released_at`; never trust array order in a
  consumer even though this repository enforces it for readability.
- Update `updated_at` whenever catalog content changes.
- Do not add credentials, private endpoints, prerelease artifacts presented as
  stable, or application source.
- Run `bun run check` before committing.
