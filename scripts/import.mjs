#!/usr/bin/env node
// Import images from import/ into content/blog/<slug>/ posts with LLM tags + alt text.
// Usage: node scripts/import.mjs [--model <name>] [--url <url>] [--dry-run]
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DateTime } from "luxon";
import { DEFAULT_MODEL, DEFAULT_URL, assertVisionModel, describeImage } from "./lib/llm.mjs";
import { IMAGE_EXTENSIONS, resizeImage, titleFromStem } from "./lib/images.mjs";

const args = process.argv.slice(2);
function flagValue(name) {
	const i = args.indexOf(name);
	return i !== -1 ? args[i + 1] : undefined;
}
const model = flagValue("--model") ?? DEFAULT_MODEL;
const url = flagValue("--url") ?? DEFAULT_URL;
const dryRun = args.includes("--dry-run");

const IMPORT_DIR = "import";
const CONTENT_DIR = join("content", "blog");

function normalizeTags(tags) {
	const seen = new Set();
	const out = [];
	for (const tag of tags ?? []) {
		if (typeof tag !== "string") continue;
		const t = tag.trim().toLowerCase().replace(/\s+/g, " ");
		if (!t) continue;
		const key = t.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(t);
		if (out.length === 6) break;
	}
	return out;
}

function normalizeAlt(alt) {
	if (typeof alt !== "string") return "";
	const t = alt.replace(/\s+/g, " ").trim();
	if (t.length < 10) return "";
	return t.slice(0, 500);
}

function yamlDoubleQuoted(s) {
	return `"${s.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

if (!dryRun) await assertVisionModel(model, url);

// Collect candidate files from import/
const entries = readdirSync(IMPORT_DIR, { withFileTypes: true });
const files = [];
for (const entry of entries) {
	if (!entry.isFile()) {
		console.warn(`warn: skipping subdirectory ${entry.name}/ (only top-level files are imported)`);
		continue;
	}
	if (entry.name === ".gitkeep") continue;
	const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf("."));
	if (ext === ".mp4") {
		console.warn(`warn: skipping ${entry.name} (.mp4 has no vision; import it manually)`);
		continue;
	}
	if (!IMAGE_EXTENSIONS.includes(ext)) {
		console.warn(`warn: skipping ${entry.name} (unsupported extension ${ext})`);
		continue;
	}
	const stem = entry.name.slice(0, entry.name.length - ext.length);
	if (stem === "" || stem.includes(".") || stem !== stem.trim() || stem !== stem.replace(/(^-+|-+$)/g, "")) {
		console.warn(`warn: skipping ${entry.name} (stem "${stem}" is empty or has odd separators; rename it)`);
		continue;
	}
	files.push(entry.name);
}
files.sort((a, b) => a.localeCompare(b));

const results = { imported: 0, skipped: [], failed: [] };

for (const filename of files) {
	const dot = filename.lastIndexOf(".");
	const ext = filename.slice(dot); // original casing for the written file
	const stem = filename.slice(0, dot);
	const slug = stem;
	const title = titleFromStem(stem);
	const postDir = join(CONTENT_DIR, slug);

	if (existsSync(postDir)) {
		results.skipped.push({ filename, reason: "post already exists; rename the file to import as a new post" });
		continue;
	}

	if (dryRun) {
		console.log(`${filename} -> ${slug} / "${title}"`);
		continue;
	}

	try {
		mkdirSync(postDir, { recursive: true });
		const destPath = join(postDir, filename);
		resizeImage(join(IMPORT_DIR, filename), destPath);

		let frontmatterAlt = "";
		let frontmatterTags = [];
		try {
			const { tags, alt } = await describeImage({ imagePath: destPath, model, url });
			frontmatterTags = normalizeTags(tags);
			frontmatterAlt = normalizeAlt(alt);
		} catch (err) {
			results.failed.push({ filename, reason: `LLM: ${err.message}` });
		}

		const lines = [
			"---",
			`title: ${yamlDoubleQuoted(title)}`,
			`date: ${DateTime.local().toISO({ suppressMilliseconds: true })}`,
			"draft: false",
		];
		if (frontmatterAlt) lines.push(`alt: ${yamlDoubleQuoted(frontmatterAlt)}`);
		if (frontmatterTags.length > 0) {
			lines.push("tags:");
			for (const tag of frontmatterTags) lines.push(`- ${tag}`);
		}
		lines.push("---", "");
		writeFileSync(join(postDir, "index.md"), lines.join("\n"));

		rmSync(join(IMPORT_DIR, filename));
		results.imported++;
		console.log(`imported ${filename} -> content/blog/${slug}/`);
	} catch (err) {
		results.failed.push({ filename, reason: err.message });
		rmSync(postDir, { recursive: true, force: true });
		console.error(`failed ${filename}: ${err.message}`);
	}
}

const skippedCount = results.skipped.length;
const failedCount = results.failed.length;
console.log(`\nimported ${results.imported}, skipped ${skippedCount}, failed ${failedCount}`);
for (const s of results.skipped) console.log(`  skipped ${s.filename}: ${s.reason}`);
for (const f of results.failed) console.log(`  failed ${f.filename}: ${f.reason}`);
if (dryRun && files.length > 0) {
	const collisions = results.skipped.map((s) => s.filename);
	if (collisions.length > 0) console.log(`collisions: ${collisions.join(", ")}`);
}
process.exit(dryRun ? (results.skipped.length > 0 ? 1 : 0) : (results.imported === files.length ? 0 : 1));
