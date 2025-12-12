# Release Process

This document describes how to create a new release of the Heatmap Bases View plugin.

## Prerequisites

- Ensure all changes are committed and pushed to the repository
- Ensure the build is working: `npm run build`
- Ensure tests/linting pass: `npm run lint`

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **Patch** (1.0.4 → 1.0.5): Bug fixes, minor tweaks
- **Minor** (1.0.4 → 1.1.0): New features, backward compatible
- **Major** (1.0.4 → 2.0.0): Breaking changes

## Release Steps

### Option 1: Automated Release (Recommended)

Use npm's built-in version bumping, which automatically updates all necessary files:

```bash
# For a patch release (bug fixes):
npm version patch

# For a minor release (new features):
npm version minor

# For a major release (breaking changes):
npm version major
```

This command will:
1. Update `version` in `package.json`
2. Update `version` in `manifest.json`
3. Add the new version to `versions.json`
4. Create a git commit with the version bump
5. Create a git tag (with "v" prefix, e.g., "v1.0.5")

**Note:** If you need to update `minAppVersion` in `manifest.json`, edit it manually **before** running `npm version`.

### Option 2: Manual Release

If you prefer manual control:

1. **Update `manifest.json`**:
   ```json
   {
     "version": "1.0.5",
     "minAppVersion": "1.10.0"
   }
   ```

2. **Update `versions.json`**:
   ```json
   {
     "1.0.5": "1.10.0"
   }
   ```

3. **Update `package.json`**:
   ```json
   {
     "version": "1.0.5"
   }
   ```

4. **Commit the changes**:
   ```bash
   git add manifest.json versions.json package.json
   git commit -m "Bump version to 1.0.5"
   ```

## Build and Publish

### 1. Build the Plugin

```bash
npm run build
```

This creates `main.js` in the project root.

### 2. Push Changes and Tags

```bash
git push
git push --tags
```

### 3. Create GitHub Release

1. Go to your repository's [Releases page](https://github.com/ppeirce/obsidian-heatmap-bases-view/releases)
2. Click **"Draft a new release"**
3. Configure the release:
   - **Tag**: Use the exact version number **without "v" prefix** (e.g., `1.0.5`, NOT `v1.0.5`)
     - If you used `npm version`, you'll have a tag like `v1.0.5`, but create the release tag as `1.0.5`
   - **Title**: Version number (e.g., "1.0.5") or descriptive title (e.g., "1.0.5 - Performance improvements")
   - **Description**: Add release notes describing changes:
     ```markdown
     ## What's Changed
     - Fixed issue with heatmap not loading as default view
     - Added color scheme tooltips
     - Performance improvements for large datasets

     ## Full Changelog
     https://github.com/ppeirce/obsidian-heatmap-bases-view/compare/1.0.4...1.0.5
     ```

4. **Attach release artifacts** (required):
   - Click "Attach binaries by dropping them here or selecting them"
   - Upload these three files from your project root:
     - `manifest.json`
     - `main.js`
     - `styles.css`

5. Click **"Publish release"**

## Post-Release

After publishing the release:

1. Verify the release appears on the [Releases page](https://github.com/ppeirce/obsidian-heatmap-bases-view/releases)
2. Verify all three files are attached to the release
3. If this is your first release or a major update, consider updating the plugin in the Obsidian Community Plugins catalog (follow the [official submission process](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin))

## Troubleshooting

### Tag Prefix Mismatch

If you used `npm version`, you'll have a git tag with "v" prefix (e.g., `v1.0.5`), but Obsidian requires GitHub releases to use tags **without** the "v" prefix (e.g., `1.0.5`). When creating the GitHub release, manually specify the tag as `1.0.5`.

### Missing Build Artifacts

If `main.js` is missing, run `npm run build` before creating the release.

### Wrong minAppVersion

The `minAppVersion` in `manifest.json` should be the **minimum Obsidian version** required to run your plugin. Update this only when you use new Obsidian API features that require a newer version.

## Quick Reference

**Current version**: Check `manifest.json` for the current version.

**One-liner for patch release**:
```bash
npm version patch && git push && git push --tags && npm run build
```

Then create the GitHub release with the three files attached.
