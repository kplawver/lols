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
└── <slug>.gif        # the meme itself (gif/jpg/jpeg/png/mp4)
```

Post bodies are empty on purpose — the `_config/filters.js` `postImages` filter picks up every image in the bundle and renders it. Posts are published at `/posts/<slug>/` (the same URLs the old Hugo site used).

Tags are plain front matter; each gets a page at `/tags/<tag>/`.
