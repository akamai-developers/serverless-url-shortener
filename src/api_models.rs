use anyhow::Context;
use serde::{Deserialize, Serialize};
use spin_sdk::http::conversions::TryFromBody;

#[derive(Deserialize, Serialize)]
pub(crate) struct LinkApiModel {
    pub short: String,
    pub url: String,
}

#[derive(Deserialize, Serialize)]
pub(crate) struct UpdateLinkApiModel {
    pub url: String,
}

impl TryFromBody for LinkApiModel {
    type Error = anyhow::Error;

    fn try_from_body(body: Vec<u8>) -> std::result::Result<Self, Self::Error>
    where
        Self: Sized,
    {
        serde_json::from_slice(&body)
            .with_context(|| "Error deserializing request payload into API model")
    }
}

impl TryFromBody for UpdateLinkApiModel {
    type Error = anyhow::Error;

    fn try_from_body(body: Vec<u8>) -> std::result::Result<Self, Self::Error>
    where
        Self: Sized,
    {
        serde_json::from_slice(&body)
            .with_context(|| "Error deserializing request payload into API model")
    }
}
