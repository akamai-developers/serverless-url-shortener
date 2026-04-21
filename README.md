# Serverless URL Shortener

A Wasm-based serverless URL shortener built with [Spin](https://spinframework.dev) and [Astro](https://astro.build), deployable to Akamai Functions.

Short links are stored in Spin's (or Akamai Function's) built-in key-value store. Every redirect increments a hit counter. A responsive management UI is included in the box as well.

---

## Prerequisites

To compile and run the application locally you need:

- [`spin` CLI](https://spinframework.dev) — the Spin runtime
- [Rust](https://rust-lang.org/tools/install/) with the `wasm32-wasip2` target:
  ```bash
  rustup target add wasm32-wasip2
  ```
- [Node.js](https://nodejs.org/) >= 22.12.0 (for building the frontend)

For deploying to **Akamai Functions** you additionally need the `aka` plugin for `spin` CLI:

```bash
spin plugins install aka --yes
```

---

## Building

Compile both the API and the frontend in one step:

```bash
spin build
```

This runs `cargo build --target wasm32-wasip2 --release` in `api/` and `npm run build` in `frontend/`.

---

## Running locally

```bash
spin up
```

The application starts on **http://localhost:3000**.

| What | URL |
|---|---|
| **Management UI** | http://localhost:3000/app |
| **Follow a short link** | http://localhost:3000/:short |
| **REST API** | http://localhost:3000/_api/links |

Open [http://localhost:3000](http://localhost:3000), and you will be redirected to the UI automatically.

---

## Using the UI

Navigate to [http://localhost:3000/app](http://localhost:3000/app) to open the management dashboard. From there you can:

- **Add** a new short link by entering a short code and a destination URL
- **Check availability** of a short code in real time as you type
- **Edit** the destination URL of any existing link
- **Delete** a link with an inline confirmation prompt
- **See hit counts** for every link

---

## REST API

All API routes are prefixed with `/_api/`.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/_api/links` | List all short links |
| `GET` | `/_api/links/:short/available` | Check whether a short code is available |
| `POST` | `/_api/links` | Create a new short link |
| `PUT` | `/_api/links/:short` | Update the destination URL of an existing link |
| `DELETE` | `/_api/links/:short` | Delete a short link |
| `GET` | `/:short` | Redirect to the destination URL (increments hit count) |

### Create a link

```bash
curl -iX POST http://localhost:3000/_api/links \
  -H 'content-type: application/json' \
  -d '{"short": "web", "url": "https://akamai.com"}'
```

Returns `201 Created` on success, `400 Bad Request` if the short code already exists.

### Check availability

```bash
# Check if web is available
curl http://localhost:3000/_api/links/web/available
```

```json
{ "available": false }
```

### List all links

```bash
curl http://localhost:3000/_api/links
```

```json
[
  { "short": "web",  "url": "https://akamai.com",     "hits": 42 },
  { "short": "docs", "url": "https://spinframework.dev", "hits": 7  }
]
```

### Update a link

```bash
curl -iX PUT http://localhost:3000/_api/links/web \
  -H 'content-type: application/json' \
  -d '{"url": "https://www.akamai.com"}'
```

Returns `204 No Content` on success.

### Delete a link

```bash
curl -iX DELETE http://localhost:3000/_api/links/web
```

Returns `204 No Content` on success.

### Follow a short link

```bash
curl -i http://localhost:3000/web
```

Returns a `301 Moved Permanently` redirect to the destination URL.

---

## Deploying to Akamai Functions

```bash
# Authenticate against Akamai Functions
spin aka login

#Deploy the application to your Akamai Functions account
spin aka deploy
```

After deployment the same routes are available at your assigned Akamai Functions hostname.
