# Serverless URL Shortener

This is a ultra-simple serverless URL shortener. It serves as an example for teaching developers how to build their first serverless function based on WebAssembly using [the CNCF project Spin](https://spinframework.dev). 

## What you need on your machine

To compile and run the sample on your local machine, you must have the following tools installed:

- The `spin` CLI (see https://spinframework.dev)
- Rust and its `wasm32-wasip1` target (see https://rust-lang.org/tools/install/)

For deploying this application to *Serverless Wasm Functions* on top of Akamai Cloud, the `aka` plugin for `spin` CLI and a corresponding account with *Serverless Wasm Functions* is required. You can install the `aka` plugin with the following command:

```bash
spin plugins install aka --yes
```

## Building the application

To compile the source code down to WebAssembly, use `spin build`

## Testing the application on your local machine

To test the application on your local machine, run `spin up`. This will launch the application on port `3000`.

You can add new URLs to the shortener by sending `POST` requests to `/_api/links`:

```bash
curl -iX POST -H 'content-type:application/json' \
  --data '{"short": "web", "url": "https://akamai.com"}' \
  http://localhost:3000/_api/links
```

Once the new link has been persisted, you could either use your web browser and navigate to `http://localhost:3000/web`, or send a corresponding `GET` request with `curl`:

```bash
curl -i http://localhost:3000/web
```

## Deploying to Serverless Wasm Functions on Akamai Cloud

Once you've authorized your `spin` CLI installation to interact with the multi-tenant service on your behalf (`spin aka login`), you can deploy the application to your account using the `spin aka deploy` command.