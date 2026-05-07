import { loadConfig } from "./config.ts";
import { createAppServer } from "./server.ts";
import { createLogger } from "./logger.ts";

const log = createLogger("BOOT");

const config = loadConfig();
const { server } = createAppServer(config);

server.listen(config.port, () => {
  log.info(`Server running at http://localhost:${config.port}`);
});
