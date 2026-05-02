import { initLogger } from "logging-middleware";

let started = false;

export const bootstrapLogger = (): void => {
  if (started) return;
  initLogger();
  started = true;
};
