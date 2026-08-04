# BridgeThing Apps Catalog

The federated installation source for Rizal's independent, open-source
BridgeThing desk apps.

After GitHub Pages is enabled, the source URL is intended to be:

```text
https://rizaljamhari.github.io/bridgething-apps-catalog/catalog.v1.json
```

Update the repository metadata and URL if the GitHub owner differs from
`rizaljamhari`.

## Development

```bash
bun install
bun run check
```

`bun run check` validates catalog identity, app versions, ordering, URLs,
checksums, formatting, types, tests, and the static Pages output.

## Add an app release

1. Publish an immutable ZIP in the app's independent GitHub Release.
2. Record its byte size and SHA-256 checksum.
3. Add or update the app entry in `catalog.v1.json`.
4. Put newest compatible versions first by `released_at`.
5. Update the catalog's `updated_at` timestamp.
6. Run `bun run check` and open a pull request.

The catalog contains metadata only. App source and release artifacts remain in
their own repositories.

## Publishing

The Pages workflow deploys `dist/`, which contains the catalog document and a
small human-readable landing page. GitHub Pages provides the cross-origin access
required by BridgeThing's catalog clients.

## License

MIT
