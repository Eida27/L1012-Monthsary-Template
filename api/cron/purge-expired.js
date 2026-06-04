import { ConfigError } from "../_lib/config-model.js";
import { createHandler } from "../_lib/http.js";
import { purgeExpired } from "../_lib/config-service.js";

export default createHandler(async ({ req, context }) => {
  const expected = process.env.CRON_SECRET;
  const actual = req.headers.authorization || req.headers.Authorization || "";
  if (!expected || actual !== `Bearer ${expected}`) {
    throw new ConfigError("Unauthorized.", 401);
  }

  return purgeExpired({
    store: context.store,
    storage: context.storage,
  });
});
