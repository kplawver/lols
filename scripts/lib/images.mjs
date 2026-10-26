// Shared image helpers for the import/backfill scripts.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export const IMAGE_EXTENSIONS = [".gif", ".jpg", ".jpeg", ".png", ".webp"];

export function listImageFiles(dir) {
	return readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isFile() && IMAGE_EXTENSIONS.includes(e.name.toLowerCase().slice(e.name.lastIndexOf("."))))
		.map((e) => e.name)
		.sort((a, b) => a.localeCompare(b));
}

export function titleFromStem(stem) {
	const spaced = stem.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
	return spaced.slice(0, 1).toUpperCase() + spaced.slice(1);
}

export const MAX_SIDE = 800;

/** ffmpeg lives in PATH via homebrew on macOS; override with FFMPEG_PATH. */
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

/**
 * Caps each side at MAX_SIDE preserving aspect ratio; smaller images pass
 * through pixel-identical (scale is a no-op at native size). Format follows
 * the destination extension. Animated GIFs keep animation.
 */
export function resizeImage(srcPath, destPath) {
	const result = spawnSync(
		FFMPEG,
		[
			"-y",
			"-i",
			srcPath,
			"-vf",
			`scale='min(${MAX_SIDE},iw)':'min(${MAX_SIDE},ih)':force_original_aspect_ratio=decrease`,
			destPath,
		],
		{ stdio: "ignore" },
	);
	if (result.status !== 0) {
		throw new Error(`ffmpeg exited with code ${result.status} while resizing ${srcPath}`);
	}
}
