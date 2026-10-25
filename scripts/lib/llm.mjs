// Shared ollama client for the import/backfill scripts.
export const DEFAULT_MODEL = "qwen3.8:latest";
export const DEFAULT_URL = "http://localhost:11434";

const REQUEST_TIMEOUT_MS = 300_000;

const DESCRIBE_PROMPT = `You are tagging an image for a humor website. Look at the image and reply with ONLY a JSON object (no markdown, no extra text):
{"tags": ["..."], "alt": "..."}

- "tags": 3 to 6 short lowercase tags for the image — subjects, emotions, actions, and the movie/show/game it references if you recognize it. Multi-word tags are fine (for example "star wars").
- "alt": alt text for a blind reader — describe literally what is visible in one or two plain sentences. Do not start with "image of" and do not use quotation marks.`;

const DESCRIBE_FORMAT = {
	type: "object",
	properties: {
		tags: { type: "array", items: { type: "string" } },
		alt: { type: "string" },
	},
	required: ["tags", "alt"],
};

/**
 * Throws unless `model` reports the vision capability. Older servers without
 * a `capabilities` field pass silently (the first generate call surfaces errors).
 */
export async function assertVisionModel(model, url = DEFAULT_URL) {
	const res = await fetch(`${url}/api/show`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ model }),
	});
	if (!res.ok) {
		throw new Error(`model ${model}: /api/show returned HTTP ${res.status}`);
	}
	const data = await res.json();
	if (Array.isArray(data.capabilities) && !data.capabilities.includes("vision")) {
		throw new Error(
			`model ${model} does not have the vision capability (has: ${data.capabilities.join(", ")})`,
		);
	}
}

async function chatOnce({ model, url, messages, format }) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const res = await fetch(`${url}/api/chat`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ model, messages, stream: false, think: false, format, options: { temperature: 0.2, num_predict: 300 } }),
			signal: controller.signal,
		});
		if (!res.ok) {
			throw new Error(`/api/chat returned HTTP ${res.status}: ${await res.text()}`);
		}
		return await res.json();
	} finally {
		clearTimeout(timer);
	}
}

function parseContent(content) {
	try {
		return JSON.parse(content);
	} catch {
		const match = content.match(/\{[\s\S]*\}/);
		if (match) return JSON.parse(match[0]);
		throw new Error(`could not parse model output as JSON: ${content.slice(0, 200)}`);
	}
}

/**
 * Asks the vision model for tags + alt text for the image at `imagePath`.
 * Retries once on network/HTTP errors and once if the server rejects the
 * JSON-schema `format` object.
 */
export async function describeImage({ imagePath, model = DEFAULT_MODEL, url = DEFAULT_URL }) {
	const imageBase64 = (await import("node:fs")).readFileSync(imagePath).toString("base64");
	const messages = [{ role: "user", content: DESCRIBE_PROMPT, images: [imageBase64] }];

	let format = DESCRIBE_FORMAT;
	for (let attempt = 1; ; attempt++) {
		try {
			const data = await chatOnce({ model, url, messages, format });
			const parsed = parseContent(data.message?.content ?? "");
			return { tags: parsed.tags, alt: parsed.alt };
		} catch (err) {
			if (format !== "json" && /format/i.test(err.message)) {
				format = "json"; // server rejected the JSON-schema format object
				continue;
			}
			if (attempt === 1 && !(err instanceof SyntaxError)) {
				await new Promise((r) => setTimeout(r, 5_000)); // network/HTTP error: retry once
				continue;
			}
			throw err;
		}
	}
}
