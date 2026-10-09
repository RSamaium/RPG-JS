const LOAD_FAILURE_SRC = 'LOAD_FAILURE_SRC';

export {};
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

function getMessage(args: unknown[]): string {
    return args.map((arg) => String(arg)).join(' ');
}

function shouldIgnoreConsoleMessage(args: unknown[]): boolean {
    const message = getMessage(args);
    return message.includes("Your browser does not support the Gamepad API")
        || message.includes("Not implemented: HTMLCanvasElement's getContext() method")
        || message.includes("PixiJS Warning:")
        || message.includes("PixiJS Deprecation Warning:");
}

if (typeof Image !== "undefined") {
    Object.defineProperty(global.Image.prototype, 'src', {
        set(src) {
            if (src === LOAD_FAILURE_SRC) {
                setTimeout(() => this.onerror(new Error('mocked error')));
            } else if (src.startsWith('data')) {
                setTimeout(() => this.dispatchEvent(new Event("load")));
            }
        },
    });
}

if (typeof window !== "undefined" && typeof window.HTMLMediaElement !== "undefined") {
    // Node 26 exposes an optional global localStorage accessor that returns
    // undefined unless --localstorage-file is configured. Install a deterministic
    // browser-compatible store so it cannot shadow jsdom's environment value.
    const values = new Map<string, string>();
    const testLocalStorage: Storage = {
        get length() {
            return values.size;
        },
        clear() {
            values.clear();
        },
        getItem(key) {
            return values.get(String(key)) ?? null;
        },
        key(index) {
            return Array.from(values.keys())[index] ?? null;
        },
        removeItem(key) {
            values.delete(String(key));
        },
        setItem(key, value) {
            values.set(String(key), String(value));
        },
    };
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: testLocalStorage,
    });
    Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: testLocalStorage,
    });

    Object.defineProperty(global.window.HTMLMediaElement.prototype, 'play', {
        configurable: true,
        get() {
            setTimeout(() => (this.onloadeddata && this.onloadeddata()))
            return () => { }
        }
    });

    Object.defineProperty(global.window.HTMLMediaElement.prototype, 'load', {
        configurable: true,
        get() {
            setTimeout(() => (this.onloadeddata && this.onloadeddata()))
            return () => { }
        }
    });

    window.document.body.innerHTML = `<div id="rpg"></div>`;

    // Définir une variable globale pour que le client puisse détecter l'environnement de test
    (window as any).__RPGJS_TEST__ = true;
}

console.warn = (...args: unknown[]) => {
    if (shouldIgnoreConsoleMessage(args)) {
        return;
    }
    originalConsoleWarn(...args);
};

console.error = (...args: unknown[]) => {
    if (shouldIgnoreConsoleMessage(args)) {
        return;
    }
    originalConsoleError(...args);
};

await import('vitest-webgl-canvas-mock');

if (typeof HTMLCanvasElement !== "undefined") {
    const getContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        contextId: string,
        options?: CanvasRenderingContext2DSettings | WebGLContextAttributes,
    ) {
        if (contextId === "webgl2") {
            return Reflect.apply(getContext, this, ["webgl", options]);
        }

        if (contextId === "2d" || contextId === "webgl" || contextId === "experimental-webgl") {
            return Reflect.apply(getContext, this, [contextId, options]);
        }

        return null;
    } as typeof HTMLCanvasElement.prototype.getContext;
}
