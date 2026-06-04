import { createHandler } from "../_lib/http.js";
import { saveConfig } from "../_lib/config-service.js";

export default createHandler(async ({ body, context }) => {
  return saveConfig({
    store: context.store,
    siteKey: body.siteKey,
    pin: body.pin,
    host: body.host,
    config: body.config,
    assetIds: body.assetIds,
  });
});
