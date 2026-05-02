import { initLogger } from "logging-middleware";

let booted = false;

export const bootstrapLogger = (): void => {
  if (booted) return;
  initLogger();
  booted = true;
};
