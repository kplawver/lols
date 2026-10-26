#!/usr/bin/env node
// Backfill missing tags/alt text on existing posts using a local ollama vision model.
// Usage: node scripts/backfill.mjs [--model <name>] [--url <url>] [--limit <n>] [--force]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { DEFAULT_MODEL, DEFAULT_URL, assertVisionModel, describeImage, normalizeTags } from "./lib/llm.mjs";
import { listImageFiles } from "./lib/images.mjs";

const args = process.argv.slice(2);
function flagValue(name) {
	const i = args.indexOf(name);
	return i !== -1 ? args[i + 1] : undefined;
}
const model = flagValue("--model") ?? DEFAULT_MODEL;
const url = flagValue("--url") ?? DEFAULT_URL;
const limit = flagValue("--limit") ? Number.parseInt(flagValue("--limit"), 10) : Infinity;
const force = args.includes("--force");

const CONTENT_DIR = join("content", "blog");

function normalizeAlt(alt) {
	if (typeof alt !== "string") return "";
	const t = alt.replace(/\s+/g, " ").trim();
	if (t.length < 10) return "";
	return t.slice(0, 500);
}

function yamlDoubleQuoted(s) {
	return `"${s.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/**
 * Splits an index.md into { before, entries, after } where `entries` is the
 * list of raw frontmatter lines between the opening and closing `---` lines.
 */
function splitFrontmatter(text) {
	const lines = text.split("\n");
	if (lines[0] !== "---") return null;
	const close = lines.indexOf("---", 1);
	if (close === -1) return null;
	return { before: lines.slice(0, 1), entries: lines.slice(1, close), after: lines.slice(close) };
}

/** Finds the index of a top-level `key:` line (no leading whitespace) in entries. */
function findKey(entries, key) {
	const pattern = new RegExp(`^${key}:`);
	for (let i = 0; i < entries.length; i++) {
		if (pattern.test(entries[i])) return i;
	}
	return -1;
}

/** Deletes the `key:` line and any continuation lines (indented or `- ` items) below it. */
function deleteKey(entries, keyIndex) {
	let end = keyIndex + 1;
	while (end < entries.length && (entries[end].startsWith("  ") || entries[end].startsWith("- "))) {
		end++;
	}
	entries.splice(keyIndex, end - keyIndex);
}

/**
 * Surgically insert alt/tags lines into the frontmatter: only the missing keys
 * (or both under --force). Existing lines are never rewritten.
 */
function updateFrontmatter(entries, { alt, tags, replaceAlt, replaceTags }) {
	const block = [];

	if (replaceAlt) {
		const keyIndex = findKey(entries, "alt");
		if (keyIndex !== -1) deleteKey(entries, keyIndex);
		if (typeof alt === "string" && alt !== "") {
			block.push(`alt: ${yamlDoubleQuoted(alt)}`);
		} else if (alt && typeof alt === "object" && Object.keys(alt).length > 0) {
			block.push("alt:");
			for (const [filename, text] of Object.entries(alt)) {
				block.push(`  ${filename}: ${yamlDoubleQuoted(text)}`);
			}
		}
	}

	if (replaceTags) {
		const keyIndex = findKey(entries, "tags");
		if (keyIndex !== -1) deleteKey(entries, keyIndex);
		if (tags.length > 0) {
			block.push("tags:");
			for (const tag of tags) block.push(`- ${tag}`);
		}
	}

	if (block.length === 0) return;

	// Insert after the `draft:` line, or before the closing `---` if absent.
	const draftIndex = findKey(entries, "draft");
	const insertAt = draftIndex === -1 ? entries.length : draftIndex + 1;
	entries.splice(insertAt, 0, ...block);
}

await assertVisionModel(model, url);

const slugs = readdirSync(CONTENT_DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => e.name)
	.sort((a, b) => a.localeCompare(b));

const work = [];
for (const slug of slugs) {
	const indexPath = join(CONTENT_DIR, slug, "index.md");
	let text;
	try {
		text = readFileSync(indexPath, "utf8");
	} catch {
		continue; // not a post bundle (no index.md)
	}
	const parts = splitFrontmatter(text);
	if (!parts) continue;
	const data = load(parts.entries.join("\n")) ?? {};
	const tagsMissing = !Array.isArray(data.tags) || data.tags.length === 0;
	const altMissing =
		(typeof data.alt !== "string" || data.alt.trim() === "") &&
		!(data.alt && typeof data.alt === "object" && Object.keys(data.alt).length > 0);
	if (force || tagsMissing || altMissing) {
		work.push({ slug, indexPath, text, replaceAlt: force || altMissing, replaceTags: force || tagsMissing });
	}
}

const targets = work.slice(0, limit);
console.log(`${work.length} post(s) need work; processing ${targets.length}`);

const failures = [];
let done = 0;
for (const { slug, indexPath, text, replaceAlt, replaceTags } of targets) {
	try {
		const dir = join(CONTENT_DIR, slug);
		const images = listImageFiles(dir);
		if (images.length === 0) throw new Error("no image files in post directory");

		const allTags = [];
		const altByFile = {};
		for (const image of images) {
			const { tags, alt } = await describeImage({ imagePath: join(dir, image), model, url });
			allTags.push(...normalizeTags(tags));
			const normalized = normalizeAlt(alt);
			if (normalized) altByFile[image] = normalized;
		}

		const parts = splitFrontmatter(text);
		updateFrontmatter(parts.entries, {
			alt: images.length === 1 ? (altByFile[images[0]] ?? "") : altByFile,
			tags: normalizeTags(allTags),
			replaceAlt,
			replaceTags,
		});
		writeFileSync(indexPath, [...parts.before, ...parts.entries, ...parts.after].join("\n"));
		done++;
		console.log(`[${done}/${targets.length}] ${slug} ok`);
	} catch (err) {
		failures.push(slug);
		console.error(`[${done + failures.length}/${targets.length}] ${slug} failed: ${err.message}`);
	}
}

console.log(`\nupdated ${done}, failed ${failures.length}`);
for (const slug of failures) console.log(`  failed ${slug}`);
process.exit(failures.length > 0 ? 1 : 0);
