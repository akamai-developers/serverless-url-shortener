use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::http::{IntoResponse, Params, Request, Response, ResponseBuilder, Router};
use spin_sdk::http_component;
use spin_sdk::key_value::Store;

#[http_component]
fn handle_hello_wasm_functions(req: Request) -> Result<impl IntoResponse> {
    let mut router = Router::default();
    router.get("/:short", try_follow_link);
    router.post("/_api/links", add_link);
    Ok(router.handle(req))
}

fn add_link(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let Ok(model) = serde_json::from_slice::<LinkModel>(req.body()) else {
        return Ok(Response::new(400, "Bad Request"));
    };
    let store = Store::open_default()?;
    store.set_json(model.short.clone(), &model)?;
    Ok(Response::new(201, ()))
}

fn try_follow_link(_req: Request, params: Params) -> Result<impl IntoResponse> {
    let Some(short) = params.get("short") else {
        return Ok(Response::new(400, "Bad Request"));
    };
    let store = Store::open_default()?;
    Ok(match store.get_json::<LinkModel>(short)? {
        Some(model) => ResponseBuilder::new(301)
            .header("Location", model.url)
            .body(())
            .build(),
        None => Response::new(404, "Not Found"),
    })
}

#[derive(Deserialize, Serialize)]
pub struct LinkModel {
    short: String,
    url: String,
}
