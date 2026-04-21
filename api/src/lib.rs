use anyhow::Result;
use spin_sdk::http::conversions::TryFromBody as _;
use spin_sdk::http::{IntoResponse, Params, Request, Response, ResponseBuilder, Router};
use spin_sdk::http_component;
use spin_sdk::key_value::Store;

mod api_models;
mod domain;

#[http_component]
fn handle_hello_wasm_functions(req: Request) -> Result<impl IntoResponse> {
    let mut router = Router::default();
    router.get("/:short", try_follow_link);
    router.post("/_api/links", add_link);
    router.put("/_api/links/:short", update_link);
    router.delete("/_api/links/:short", remove_link);
    router.get("/_api/links", get_all_links);
    router.get("/_api/links/:short/available", check_availability);
    router.get("/", redirect_to_app);
    Ok(router.handle(req))
}

fn redirect_to_app(_req: Request, _params: Params) -> Result<impl IntoResponse> {
    Ok(ResponseBuilder::new(301)
        .header("Location", "/app")
        .body(())
        .build())
}

fn get_all_links(_req: Request, _params: Params) -> Result<impl IntoResponse> {
    let store = Store::open_default().expect("Error opening key value store");
    let keys = store
        .get_keys()
        .expect("Error retrieving keys from key value store");
    let mut all = vec![];
    for key in keys {
        let found = store
            .get_json::<domain::LinkSchema>(key)
            .expect("Error loading link from key value store");
        if found.is_some() {
            all.push(found.unwrap());
        }
    }
    let payload = serde_json::to_vec(&all).expect("Error while serializing stats into JSON");
    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(payload)
        .build())
}

fn check_availability(_req: Request, params: Params) -> Result<impl IntoResponse> {
    let Some(short) = params.get("short") else {
        return Ok(Response::new(400, "Bad Request"));
    };
    let store = Store::open_default().expect("Could not connect to key value store");
    let exists = store.exists(short).unwrap_or(false);
    let available = !exists;
    let payload = format!("{{\"available\":{}}}", available);
    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(payload)
        .build())
}

fn add_link(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let Ok(model) = api_models::LinkApiModel::try_from_body(req.body().to_vec()) else {
        return Ok(Response::new(400, "Bad Request"));
    };

    let store = Store::open_default().expect("Could not connect to key value store");
    // Do not support overwriting existing links using the same short via POST
    let false = store.exists(model.short.clone().as_str())? else {
        return Ok(Response::new(400, "Duplicated key"));
    };
    let schema: domain::LinkSchema = model.into();
    store.set_json(schema.short.clone(), &schema)?;
    Ok(Response::new(201, ()))
}

fn update_link(req: Request, params: Params) -> Result<impl IntoResponse> {
    let Some(short) = params.get("short") else {
        return Ok(Response::new(400, "Bad Request"));
    };
    let Ok(model) = api_models::UpdateLinkApiModel::try_from_body(req.body().to_vec()) else {
        return Ok(Response::new(400, "Bad Request"));
    };
    let store = Store::open_default().expect("Could not connect to key value store");
    match store.get_json::<domain::LinkSchema>(short)? {
        Some(mut existing) => {
            existing.url = model.url.clone();
            store.set_json(short, &existing)?;
            return Ok(Response::new(204, "No Content"));
        }
        None => Ok(Response::new(404, "Can't update what's not there")),
    }
}

fn remove_link(_req: Request, params: Params) -> Result<impl IntoResponse> {
    let Some(short) = params.get("short") else {
        return Ok(Response::new(400, "Bad Request"));
    };
    let store = Store::open_default().expect("Could not connect to key value store");
    Ok(match store.delete(short) {
        Ok(_) => Response::new(204, "No Content"),
        Err(e) => Response::new(500, format!("Error while removing link: {}", e)),
    })
}

fn try_follow_link(_req: Request, params: Params) -> Result<impl IntoResponse> {
    let Some(short) = params.get("short") else {
        return Ok(Response::new(400, "Bad Request"));
    };
    let store = Store::open_default()?;
    Ok(match store.get_json::<domain::LinkSchema>(short)? {
        Some(mut model) => {
            model.hits = Some(model.hits.unwrap_or_default() + 1);
            _ = store.set_json(model.short.clone(), &model);
            model.into_response()
        }
        None => Response::new(404, "Not Found"),
    })
}

impl IntoResponse for domain::LinkSchema {
    fn into_response(self) -> Response {
        ResponseBuilder::new(301)
            .header("Location", self.url.as_str())
            .build()
    }
}

impl From<api_models::LinkApiModel> for domain::LinkSchema {
    fn from(value: api_models::LinkApiModel) -> Self {
        Self {
            short: value.short.clone(),
            url: value.url.clone(),
            hits: Some(0),
        }
    }
}

impl From<domain::LinkSchema> for api_models::LinkApiModel {
    fn from(value: domain::LinkSchema) -> Self {
        Self {
            short: value.short.clone(),
            url: value.url.clone(),
        }
    }
}
