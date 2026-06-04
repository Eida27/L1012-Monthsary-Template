import { createHandler } from "../_lib/http.js";
import { readForEdit } from "../_lib/config-service.js";

export default createHandler(async ({ body, context }) => {
  return readForEdit({
    store: context.store,
    siteKey: body.siteKey,
    pin: body.pin,
    host: body.host,
  });
});
