interface CanvasResizeSize {
  width: number;
  height: number;
}

/**
 * Skip PixiJS resizes when the resize target already matches the renderer size.
 *
 * Browsers can emit resize events without an actual size change (mobile
 * toolbars, zoom); resizing the renderer anyway clears the canvas for a frame.
 */
export function installCanvasResizeGuard(app: any) {
  if (!app || typeof app.resize !== "function") return;

  const originalResize = app.resize.bind(app);
  app.resize = () => {
    const targetSize = readCanvasResizeTargetSize(app);
    const rendererSize = readCanvasRendererSize(app);

    if (
      targetSize &&
      rendererSize &&
      targetSize.width === rendererSize.width &&
      targetSize.height === rendererSize.height
    ) {
      cancelCanvasResizeFrame(app);
      return;
    }

    originalResize();
  };
}

function readCanvasResizeTargetSize(app: any): CanvasResizeSize | null {
  const resizeTarget = app?.resizeTo;
  if (!resizeTarget || typeof window === "undefined") return null;

  const rawWidth = resizeTarget === window ? window.innerWidth : resizeTarget.clientWidth;
  const rawHeight = resizeTarget === window ? window.innerHeight : resizeTarget.clientHeight;
  const width = Math.round(Number(rawWidth));
  const height = Math.round(Number(rawHeight));

  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) return null;
  return { width, height };
}

function readCanvasRendererSize(app: any): CanvasResizeSize | null {
  const screen = app?.renderer?.screen;
  const width = Math.round(Number(screen?.width));
  const height = Math.round(Number(screen?.height));

  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
}

function cancelCanvasResizeFrame(app: any): void {
  if (typeof app?._cancelResize === "function") {
    app._cancelResize();
  }
}
