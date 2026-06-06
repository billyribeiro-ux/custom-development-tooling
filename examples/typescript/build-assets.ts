#!/usr/bin/env node
// =============================================================================
// build-assets.ts — a content-hashing asset builder, narrated in Module 7.
//
// What it does: copies static assets into an output folder, renaming each file
// with a short hash of its contents (e.g. styles.a1b2c3.css). This is
// "cache busting": when a file changes its name changes, so browsers fetch the
// new version instead of a stale cached one. It writes a manifest mapping the
// original name -> hashed name so HTML can look up the right URL.
//
// Run it directly — Node 22 strips the types and runs the JavaScript:
//   node examples/typescript/build-assets.ts --src assets --out /tmp/dist
//
// Type-check it separately (types are guardrails, not runtime):
//   npx tsc --noEmit
// =============================================================================

import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

// An interface is pure type information: Node erases it at runtime, but your
// editor and `tsc` use it to catch mistakes. This is the "guardrail" value.
interface BuildOptions {
  src: string;
  out: string;
}

// A mapping of original filename -> content-hashed filename.
type AssetManifest = Record<string, string>;

function parseOptions(): BuildOptions {
  const { values } = parseArgs({
    options: {
      src: { type: 'string', default: 'assets' },
      out: { type: 'string', default: join('/tmp', 'dist') },
    },
  });
  // The non-null assertions are safe because both options have defaults.
  return { src: values.src!, out: values.out! };
}

// Short content hash: stable for identical content, changes when content changes.
function hashContents(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

async function build({ src, out }: BuildOptions): Promise<void> {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const entries = await readdir(src, { withFileTypes: true });
  const manifest: AssetManifest = {};

  for (const entry of entries) {
    if (!entry.isFile()) continue; // skip nested dirs in this simple example
    const contents = await readFile(join(src, entry.name));
    const hash = hashContents(contents);
    const ext = extname(entry.name);
    const stem = basename(entry.name, ext);
    const hashedName = `${stem}.${hash}${ext}`;

    await writeFile(join(out, hashedName), contents);
    manifest[entry.name] = hashedName;
    console.log(`  ${entry.name}  ->  ${hashedName}`);
  }

  await writeFile(join(out, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Built ${Object.keys(manifest).length} asset(s) -> ${out}/`);
}

await build(parseOptions());
