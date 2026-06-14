import { parseConfig } from "../config.js";
import { checkSlaBreaches } from "../sla/routes.js";

export async function handler(): Promise<{ breached: number }> {
  parseConfig();
  const breached = await checkSlaBreaches();
  if (breached > 0) {
    console.log(JSON.stringify({ event: "sla.breaches_checked", breached }));
  }
  return { breached };
}
