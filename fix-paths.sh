#!/bin/bash
# Fix asset paths in built HTML files for GitHub Pages deployment

cd dist

# Fix index.html
cat index.html | \
  sed 's|src="/main-|src="/nostrpop/main-|g' | \
  sed 's|src="/shakespeare_|src="/nostrpop/shakespeare_|g' | \
  sed 's|href="/bitpopart-logo\.svg"|href="/nostrpop/bitpopart-logo.svg"|g' | \
  sed 's|href="/manifest\.webmanifest"|href="/nostrpop/manifest.webmanifest"|g' | \
  sed 's|content="/icon\.svg"|content="/nostrpop/icon.svg"|g' \
  > index.html.tmp && mv index.html.tmp index.html

# Fix 404.html
cat 404.html | \
  sed 's|src="/main-|src="/nostrpop/main-|g' | \
  sed 's|src="/shakespeare_|src="/nostrpop/shakespeare_|g' | \
  sed 's|href="/bitpopart-logo\.svg"|href="/nostrpop/bitpopart-logo.svg"|g' | \
  sed 's|href="/manifest\.webmanifest"|href="/nostrpop/manifest.webmanifest"|g' | \
  sed 's|content="/icon\.svg"|content="/nostrpop/icon.svg"|g' \
  > 404.html.tmp && mv 404.html.tmp 404.html

echo "✓ Paths fixed for GitHub Pages"
