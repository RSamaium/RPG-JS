import { sharedCanary } from "../shared";
import { fakeServerSecret, serverCanary } from "./server-only";

export { serverCanary as reexportedServerCanary } from "./reexport";

export async function loadServerDynamic(): Promise<string> {
  return (await import("./dynamic")).serverDynamicCanary;
}

export const serverArtifact = {
  sharedCanary,
  serverCanary,
  fakeServerSecret,
};
