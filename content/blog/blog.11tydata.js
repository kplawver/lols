export default {
	tags: [
		"posts"
	],
	"layout": "layouts/post.njk",
	// Hugo served posts at /posts/<slug>/ — keep every existing URL working.
	"permalink": "/posts/{{ page.fileSlug }}/",
};
