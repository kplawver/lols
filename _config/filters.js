import { DateTime } from "luxon";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const IMAGE_EXTENSIONS = new Set([".gif", ".jpg", ".jpeg", ".png", ".mp4"]);

export default function(eleventyConfig) {
	eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "dd LLLL yyyy");
	});

	eleventyConfig.addFilter("htmlDateString", (dateObj) => {
		// dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
		return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat('yyyy-LL-dd');
	});

	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if(!Array.isArray(array) || array.length === 0) {
			return [];
		}
		if( n < 0 ) {
			return array.slice(n);
		}

		return array.slice(0, n);
	});

	// Return the smallest number argument
	eleventyConfig.addFilter("min", (...numbers) => {
		return Math.min.apply(null, numbers);
	});

	// Return the keys used in an object
	eleventyConfig.addFilter("getKeys", target => {
		return Object.keys(target);
	});

	eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
		return (tags || []).filter(tag => ["all", "posts"].indexOf(tag) === -1);
	});

	eleventyConfig.addFilter("sortAlphabetically", strings =>
		(strings || []).sort((b, a) => b.localeCompare(a))
	);

	// Given a post page URL like /posts/<slug>/, return the image (or video)
	// files that live beside its source bundle in content/blog/<slug>/.
	// Posts on this site have empty bodies — the bundle images ARE the content.
	eleventyConfig.addFilter("postImages", function(pageUrl) {
		if(!pageUrl || !pageUrl.startsWith("/posts/")) {
			return [];
		}

		const slug = pageUrl.replace(/^\/posts\//, "").replace(/\/$/, "");
		const dir = join("content", "blog", slug);

		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return [];
		}

		return entries
			.filter(entry => {
				if(!entry.isFile()) {
					return false;
				}
				const dot = entry.name.lastIndexOf(".");
				if(dot === -1) {
					return false;
				}
				return IMAGE_EXTENSIONS.has(entry.name.slice(dot).toLowerCase());
			})
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(entry => ({
				// Absolute site-root URL: pages live at /posts/<slug>/ but the
				// copied bundle files live at /blog/<slug>/<filename>.
				url: `/blog/${slug}/${entry.name}`,
				filename: entry.name,
				alt: null,
			}));
	});
};
