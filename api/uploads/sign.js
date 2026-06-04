import { createHandler } from "../_lib/http.js";
import { signUpload } from "../_lib/config-service.js";

export default createHandler(async ({ body, context }) => {
  return signUpload({
    store: context.store,
    storage: context.storage,
    siteKey: body.siteKey,
    pin: body.pin,
    host: body.host,
    slot: body.slot,
    fileName: body.fileName,
    contentType: body.contentType,
    sizeBytes: body.sizeBytes,
  });
});
