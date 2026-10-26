#!/usr/bin/env node
// Fails when two tags would render the same /tags/<slug>/ page (Eleventy
// slugifies tag text, so "pixel-art" and "pixel art" silently merge into one
// page and the other spelling's posts vanish from it). Run before builds.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeTags } from "./lib/llm.mjs";

const CONTENT_DIR = join("content", "blog");
// canonical slug -> Map of distinct raw spellings -> first file seen with it
const byCanonical = new Map();

for (const slug of readdirSync(CONTENT_DIR, { withFileTypes: true })) {
	if (!slug.isDirectory()) continue;
	const path = join(CONTENT_DIR, slug.name, "index.md");
	let text;
	try {
		text = readFileSync(path, "utf8");
	} catch {
		continue; // not a post bundle
	}
	const lines = text.split("\n");
	const start = lines.indexOf("tags:");
	if (start === -1) continue;
	for (let i = start + 1; i < lines.length && lines[i].startsWith("- "); i++) {
		const raw = lines[i].slice(2).trim();
		const canonical = normalizeTags([raw])[0];
		if (!canonical) continue;
		if (!byCanonical.has(canonical)) byCanonical.set(canonical, new Map());
		const spellings = byCanonical.get(canonical);
		if (!spellings.has(raw)) spellings.set(raw, path);
	}
}

const collisions = [...byCanonical.entries()].filter(([, spellings]) => spellings.size > 1);
if (collisions.length > 0) {
	const details = collisions
		.map(([canonical, spellings]) =>
			`  /tags/${canonical.replaceAll(" ", "-")}/\n${[...spellings].map(([tag, path]) => `    "${tag}" in ${path}`).join("\n")}`,
		)
		.join("\n");
	console.error(`tag collision — these spellings slug to the same page, keep one (lowercase, spaces):\n${details}`);
	process.exit(1);
}
