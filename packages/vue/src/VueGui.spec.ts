import { afterEach, describe, expect, test, vi } from "vitest";
import { RpgClientEngine, RpgGui } from "@rpgjs/client";
import { h, nextTick } from "vue";
import { VueGui } from "./VueGui";

const clientMock = vi.hoisted(() => {
    class RpgClientEngine {}
    class RpgGui {}
    return {
        RpgClientEngine,
        RpgGui,
        values: new Map<any, any>(),
    };
});

vi.mock("@rpgjs/client", () => {
    return {
        Context: class Context {},
        RpgClientEngine: clientMock.RpgClientEngine,
        RpgGui: clientMock.RpgGui,
        inject: (service: any) => clientMock.values.get(service),
    };
});

const propagate = (event: Event) => {
    const vueGui = new VueGui({} as any);
    (vueGui as any).propagateEvent(event);
};

const createCanvas = () => {
    document.body.innerHTML = '<div id="rpg"><canvas></canvas></div>';
    return document.querySelector("#rpg canvas") as HTMLCanvasElement;
};

const pointerTest = typeof PointerEvent === "undefined" ? test.skip : test;

const subscribe = vi.fn(() => ({
    unsubscribe: vi.fn(),
}));

const createCollection = (items: Record<string, any>) => {
    return Object.assign(() => items, {
        observable: {
            subscribe,
        },
    });
};

const createMountedVueGui = async () => {
    document.body.innerHTML = '<div id="rpg"><canvas></canvas><div id="vue-gui-overlay"></div></div>';
    const canvas = document.querySelector("#rpg canvas") as HTMLCanvasElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        width: 640,
        height: 480,
        top: 0,
        right: 640,
        bottom: 480,
        left: 0,
        toJSON: () => ({}),
    } as DOMRect);

    const player = {
        id: "player-1",
        x: 100,
        y: 120,
        hitbox: {
            w: 32,
            h: 32,
        },
        name: () => "Player",
    };
    const scene = {
        players: createCollection({
            "player-1": player,
        }),
        events: createCollection({}),
        currentPlayer: Object.assign(() => player, {
            observable: {
                subscribe,
            },
        }),
        getCurrentPlayer: () => player,
    };
    const clientEngine = {
        scene,
        renderer: {
            screen: {
                width: 640,
                height: 480,
            },
        },
        sounds: new Map(),
        spritesheets: new Map(),
        tick: {
            subscribe,
        },
    };
    const parentGui = {
        _setVueGuiInstance: vi.fn(),
        _initializeVueComponents: vi.fn(),
        getVueGuis: () => [],
        shouldDisplayAttachedGui: (id: string) => id === "player-1",
        attachedGuiDisplayState: {
            observable: {
                subscribe,
            },
        },
    };
    clientMock.values.set(RpgClientEngine, clientEngine);
    clientMock.values.set(RpgGui, parentGui);

    const vueGui = new VueGui({} as any);
    vueGui.mount();

    return vueGui;
};

afterEach(() => {
    clientMock.values.clear();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
});

describe("VueGui v-propagate", () => {
    test("redispatches mouse events to the RPGJS canvas without changing viewport coordinates", () => {
        const canvas = createCanvas();
        let propagated: MouseEvent | undefined;
        canvas.addEventListener("mousedown", (event) => {
            propagated = event;
        });

        const event = new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: 120,
            clientY: 80,
            screenX: 220,
            screenY: 180,
            button: 1,
            buttons: 2,
            ctrlKey: true,
            shiftKey: true,
        });

        propagate(event);

        expect(propagated).toBeDefined();
        expect(propagated?.clientX).toBe(120);
        expect(propagated?.clientY).toBe(80);
        expect(propagated?.screenX).toBe(220);
        expect(propagated?.screenY).toBe(180);
        expect(propagated?.button).toBe(1);
        expect(propagated?.buttons).toBe(2);
        expect(propagated?.ctrlKey).toBe(true);
        expect(propagated?.shiftKey).toBe(true);
    });

    test("redispatches wheel events with their delta values", () => {
        const canvas = createCanvas();
        let propagated: WheelEvent | undefined;
        canvas.addEventListener("wheel", (event) => {
            propagated = event;
        });

        const event = new WheelEvent("wheel", {
            bubbles: true,
            clientX: 50,
            clientY: 40,
            deltaX: 2,
            deltaY: 12,
            deltaZ: 1,
            deltaMode: WheelEvent.DOM_DELTA_LINE,
        });

        propagate(event);

        expect(propagated).toBeDefined();
        expect(propagated?.clientX).toBe(50);
        expect(propagated?.clientY).toBe(40);
        expect(propagated?.deltaX).toBe(2);
        expect(propagated?.deltaY).toBe(12);
        expect(propagated?.deltaZ).toBe(1);
        expect(propagated?.deltaMode).toBe(WheelEvent.DOM_DELTA_LINE);
    });

    pointerTest("redispatches pointer events with pointer metadata", () => {
        const canvas = createCanvas();
        let propagated: PointerEvent | undefined;
        canvas.addEventListener("pointerdown", (event) => {
            propagated = event;
        });

        const event = new PointerEvent("pointerdown", {
            bubbles: true,
            clientX: 30,
            clientY: 25,
            pointerId: 7,
            pointerType: "pen",
            isPrimary: true,
            pressure: 0.5,
        });

        propagate(event);

        expect(propagated).toBeDefined();
        expect(propagated?.clientX).toBe(30);
        expect(propagated?.clientY).toBe(25);
        expect(propagated?.pointerId).toBe(7);
        expect(propagated?.pointerType).toBe("pen");
        expect(propagated?.isPrimary).toBe(true);
        expect(propagated?.pressure).toBe(0.5);
    });

    test("does not throw when the RPGJS canvas is missing", () => {
        document.body.innerHTML = "";

        expect(() => propagate(new MouseEvent("click"))).not.toThrow();
    });
});

describe("VueGui root render", () => {
    test("updates attached targets without rendering null fixed GUI children", async () => {
        const vueGui = await createMountedVueGui();
        const HiddenGui = {
            name: "HiddenGui",
            render: () => h("div", { class: "hidden-gui" }),
        };
        const VisibleGui = {
            name: "VisibleGui",
            render: () => h("div", { class: "visible-gui" }),
        };
        const NameplateGui = {
            name: "NameplateGui",
            render: () => h("div", { class: "nameplate-gui" }),
        };

        vueGui.updateGuiState({
            name: "hidden-gui",
            component: HiddenGui,
            renderer: "vue",
            data: {},
            attachToSprite: false,
            display: false,
        });
        vueGui.updateGuiState({
            name: "visible-gui",
            component: VisibleGui,
            renderer: "vue",
            data: {},
            attachToSprite: false,
            display: true,
        });
        vueGui.updateGuiState({
            name: "nameplate-gui",
            component: NameplateGui,
            renderer: "vue",
            data: {},
            attachToSprite: true,
            display: false,
        });

        await nextTick();

        expect(() => (vueGui as any).updateAttachedTargets()).not.toThrow();
        await nextTick();

        expect(document.querySelector(".hidden-gui")).toBeNull();
        expect(document.querySelector(".visible-gui")).not.toBeNull();
        expect(document.querySelector(".nameplate-gui")).not.toBeNull();

        vueGui.updateGuiState({
            name: "visible-gui",
            component: VisibleGui,
            renderer: "vue",
            data: {},
            attachToSprite: false,
            display: false,
        });
        expect(() => (vueGui as any).updateAttachedTargets()).not.toThrow();
        await nextTick();

        expect(document.querySelector(".visible-gui")).toBeNull();
        expect(document.querySelector(".nameplate-gui")).not.toBeNull();

        vueGui.destroy();
    });
});
