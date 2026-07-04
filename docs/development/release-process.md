# Release Process

## Checklist

1. `node tests/run-all.js` — all tests must pass
2. Update `CHANGELOG.md` with the new version section
3. Bump `version` in `package.json` and `src/zolto.js`
4. Commit: `git commit -m "chore(release): vX.Y.Z"`
5. Tag: `./scripts/release.sh X.Y.Z`

The `release.yml` workflow runs the test suite, then creates a GitHub Release
with auto-generated notes from the commits since the last tag.

## Version policy

| Change | Bump |
| :----- | :--- |
| Bug fix, no API change | `patch` (2.0.x) |
| New syntax, backward-compatible | `minor` (2.x.0) |
| Breaking API change | `major` (x.0.0) |

Breaking changes require a migration guide in `CHANGELOG.md`.
