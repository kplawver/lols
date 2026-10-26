# LOLS

A Saturday morning project while social distancing during COVID-19 to turn my stupid collection of memes collected over the last decade+ into a garbage website where you can see them, browse by tags, and send them to various social things and have them show up correctly as a preview.

Since this is just a toy, it's completely open source, so feel free to grab it, delete everything under `content/blog` and go to town creating your own stupid thing.

[Here's the live site](https://lols.lawver.net).

## Setup

The site is built with [Eleventy](https://www.11ty.dev). Toolchain is managed with [mise](https://mise.jdx.dev) (see `.mise.toml`: Node 24, Yarn 4):

```sh
mise install          # install pinned node + yarn
yarn install          # install dependencies
yarn start            # dev server at http://localhost:8080
yarn build            # production build into _site/
```

## Content

Each meme lives in its own bundle under `content/blog/<slug>/`:

```
content/blog/<slug>/
├── index.md          # front matter: title, date, tags
└── <slug>.gif        # the meme itself (gif/jpg/jpeg/png/webp/mp4)
```

Post bodies are empty on purpose — the `_config/filters.js` `postImages` filter picks up every image in the bundle and renders it. Posts are published at `/posts/<slug>/` (the same URLs the old Hugo site used).

Tags are plain front matter; each gets a page at `/tags/<tag>/`.


## Importing images

Drop image files (`.gif`, `.jpg`, `.jpeg`, `.png`, `.webp`) into `import/` and run:

```sh
yarn import:images                          # default model: qwen3.8:latest
yarn import:images -- --model gemma4:26b    # or any installed vision model
```

Each file becomes a post at `content/blog/<slug>/` (slug = filename stem, e.g. `zebra_sure_can_dance` → title "Zebra sure can dance"). A local [ollama](http://localhost:11434) vision model generates tags and alt text; the model must be vision-capable. If tagging quality is too weak, try a larger installed model (`gemma4:26b`, `ornith-1.5:35b`). Imported files are consumed (moved into the post bundle, resized so no side exceeds 800px). `--dry-run` prints the plan without touching anything. Files are never overwritten — rename the source file to import under a new slug.

To fill in missing tags/alt text on existing posts:

```sh
yarn backfill -- --limit 50   # first 50 posts that need work
yarn backfill -- --force      # redo posts that already have tags/alt
```

Note: ollama reads only the first frame of GIFs, so tags/alt describe that frame.

## Tag format

Tags are canonicalized on import/backfill: lowercase, spaces between words, no
punctuation (e.g. `pixel art`, never `pixel-art`). Since tag URLs are slugified
tag text, two spellings of the same tag would collide on `/tags/<slug>/` — the
build fails with a `tag collision` error if front matter ever contains both,
and the import/backfill scripts merge them into one.
