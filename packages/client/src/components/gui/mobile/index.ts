import { inject } from "../../../core/inject";
import { RpgClientEngine } from "../../../RpgClientEngine";
import MobileGui from "./mobile.ce";
import { computed } from "canvasengine";
import type { ButtonProps, ComponentFunction, JoystickSettings } from "canvasengine";

export type MobileGuiEnabled = "auto" | "always" | "never" | (() => boolean);
export type MobileGuiJoystickSide = "left" | "right";
export type MobileGuiMargin = number | [number, number, number, number];

export interface MobileGuiLayoutOptions {
    joystickSide?: MobileGuiJoystickSide;
    margin?: MobileGuiMargin;
    buttonsMargin?: MobileGuiMargin;
    joystickMargin?: MobileGuiMargin;
    gap?: number;
}

export interface MobileJoystickComponentProps extends JoystickSettings {
    defaultProps: JoystickSettings;
}

export interface MobileButtonComponentProps extends ButtonProps {
    controlName: "action" | "back" | "dash" | "heavy";
    defaultProps: ButtonProps;
}

export interface MobileGuiComponentsOptions {
    joystick?: ComponentFunction<MobileJoystickComponentProps>;
    buttons?: {
        action?: ComponentFunction<MobileButtonComponentProps>;
        back?: ComponentFunction<MobileButtonComponentProps>;
        dash?: ComponentFunction<MobileButtonComponentProps>;
        heavy?: ComponentFunction<MobileButtonComponentProps>;
    };
}

export interface MobileGuiButtonOptions extends Partial<ButtonProps> {
    enabled?: boolean;
    component?: ComponentFunction<MobileButtonComponentProps>;
    container?: Record<string, unknown>;
}

export interface MobileGuiJoystickOptions extends Partial<JoystickSettings> {
    component?: ComponentFunction<MobileJoystickComponentProps>;
    moveInterval?: number;
    threshold?: number;
}

export interface MobileGuiOptions {
    id?: string;
    enabled?: MobileGuiEnabled;
    layout?: MobileGuiLayoutOptions;
    components?: MobileGuiComponentsOptions;
    joystick?: false | MobileGuiJoystickOptions;
    buttons?: {
        action?: boolean | MobileGuiButtonOptions;
        back?: boolean | MobileGuiButtonOptions;
        dash?: boolean | MobileGuiButtonOptions;
        heavy?: boolean | MobileGuiButtonOptions;
    };
}

function isMobile() {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry/i.test(navigator.userAgent);
}

function resolveEnabled(enabled: MobileGuiEnabled = "auto") {
    if (enabled === "always") return true;
    if (enabled === "never") return false;
    if (typeof enabled === "function") return enabled();
    return isMobile();
}

export const withMobile = (options: MobileGuiOptions = {}) => (
    {
        gui: [
            {
                id: options.id ?? 'mobile-gui',
                component: MobileGui,
                autoDisplay: true,
                data: options,
                dependencies: () => {
                    const engine = inject(RpgClientEngine);
                    return [
                        computed(() => resolveEnabled(options.enabled) || undefined),
                        engine.controlsReady
                    ]
                }
            }
        ]
    }
)
