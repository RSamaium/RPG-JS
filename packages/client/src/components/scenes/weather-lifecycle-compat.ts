import "@canvasengine/presets";
import { createComponent } from "canvasengine";
import { patchWeatherTickLifecycle } from "./weather-tick-lifecycle";

for (const tag of ["RainTextureLayer", "RainImpactLayer"]) {
  const probe = createComponent(tag);
  patchWeatherTickLifecycle(Object.getPrototypeOf(probe.componentInstance));
}
