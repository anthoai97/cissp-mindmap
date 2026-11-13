# CISSP Mind Maps

A static website that renders CISSP mind maps from JSON files in `data/`.

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

The site is written to `.cloudflare/output/v0/workers/default/assets/`. It uses relative paths and hash URLs (`#/map/...`), so that folder works on any static host.

## Deploy

The site runs on Cloudflare Workers as a static-assets Worker at https://cissp.andyq.dev. The settings are in `cloudflare.config.ts`.

```sh
npm run deploy
```

This type-checks, builds with Vite and deploys with the `cf` CLI. Sign in once with `npx cf auth login`. The home page shows the build date, so you can confirm which version is live.

## Add a mind map

Add a JSON file to `data/`. The site picks up every `data/*.json` file automatically.

| Field | Meaning |
| --- | --- |
| `id`, `title`, `description` | The map's URL slug, name and summary. |
| `domain`, `order` | CISSP domain number and position within the domain. |
| `source` | Link to the original material. |
| `layout` | Optional. `"stacked"` shows each top-level node as its own section. |
| `nodes` | The top-level nodes. |

Each node has `id`, `title`, `description` and `children`. Optional fields:

- `highlight`: `"own-mindmap"` (purple box) or `"exam-key"` (gold text).
- `mindmap`: the `id` of another map that covers the topic in detail.

In a `description`, lines starting with `- ` render as a bullet list and lines starting with `1. ` as a numbered list.
