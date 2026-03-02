use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub(crate) struct LinkSchema {
    pub short: String,
    pub url: String,
    pub hits: Option<u32>,
}
