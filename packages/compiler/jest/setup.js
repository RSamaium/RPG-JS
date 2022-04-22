require('jest-webgl-canvas-mock')

jest.setTimeout(10000)

const LOAD_FAILURE_SRC = 'LOAD_FAILURE_SRC';

Object.defineProperty(global.Image.prototype, 'src', {
    set(src) {
        if (src === LOAD_FAILURE_SRC) {
            setTimeout(() => this.onerror(new Error('mocked error')));
        } else if (src.startsWith('data')) {
            setTimeout(() => this.dispatchEvent(new Event("load")));
        }
    },
});

Object.defineProperty(global.window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    get () {
      setTimeout(() => (this.onloadeddata && this.onloadeddata()))
      return () => {}
    }
})

Object.defineProperty(global.window.HTMLMediaElement.prototype, 'load', {
    configurable: true,
    get () {
      setTimeout(() => (this.onloadeddata && this.onloadeddata()))
      return () => {}
    }
})

window.document.body.innerHTML = `<div id="rpg"></div>`