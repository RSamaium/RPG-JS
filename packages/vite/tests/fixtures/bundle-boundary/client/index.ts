import { sharedCanary } from "../shared";
import { clientCanary, readBrowserSide } from "./client-only";

export { clientCanary as reexportedClientCanary } from "./reexport";

export async function loadClientDynamic(): Promise<string> {
  return (await import("./dynamic")).clientDynamicCanary;
}

export const clientArtifact = {
  sharedCanary,
  clientCanary,
  browserSide: readBrowserSide(),
};
