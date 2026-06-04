import { createHandler } from "../_lib/http.js";
import { readPublicConfig } from "../_lib/config-service.js";

export default createHandler(async ({ query, context }) => {
  return readPublicConfig({
    store: context.store,
    storage: context.storage,
    host: query.host,
  });
});
