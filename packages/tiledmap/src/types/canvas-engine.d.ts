declare module "*.ce" {
  import type { ComponentFunction } from "canvasengine";

  const component: ComponentFunction;
  export default component;
}
