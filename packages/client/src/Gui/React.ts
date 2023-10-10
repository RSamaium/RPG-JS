import { createRoot } from 'react-dom/client';
import { createElement, Fragment, useState, createContext, useEffect, useContext, useCallback, useSyncExternalStore, useRef } from 'react'
import { RpgClientEngine } from '../RpgClientEngine';
import { RpgRenderer } from '../Renderer';
import { BehaviorSubject, map, tap, combineLatest, Subject } from 'rxjs';
import type { Gui } from './Gui';

export { useStore } from '@nanostores/react'
export const RpgReactContext = createContext({} as any)

// TODO
export const useObjects = () => {
    const [objects, setObjects] = useState([] as any[])
    const { rpgObjects } = useContext(RpgReactContext)
    useEffect(() => {
        rpgObjects
            .pipe(
                map((objects: any) => Object.values(objects).map((obj: any) => obj.object))
            )
            .subscribe(setObjects)
    }, [])
    return objects
}

// TODO
export const useCurrentPlayer = () => {
    const { rpgCurrentPlayer } = useContext(RpgReactContext);

    const currentPlayerRef = useRef({});
    let _onChanges

    const subscribe = (onChanges) => {
        _onChanges = onChanges
        return () => {
            _onChanges = null
        }
    }

    useEffect(() => {
        const ob$ = rpgCurrentPlayer
            .pipe(
                map((player: any) => player.object),
                tap((player: any) => currentPlayerRef.current = player)
            );
        const subscription = ob$.subscribe(() => {
            _onChanges?.()
        });
        return () => subscription.unsubscribe();
    }, []);

    return useSyncExternalStore(subscribe, () => currentPlayerRef.current);
}

export class ReactGui {
    private app: any
    private clientEngine: RpgClientEngine
    private renderer: RpgRenderer
    private _gui: BehaviorSubject<any[]> = new BehaviorSubject([] as any)
    //private _tooltips: BehaviorSubject<any[]> = new BehaviorSubject([] as any)

    constructor(rootEl: HTMLDivElement, parentGui: Gui) {
        this.app = createRoot(rootEl)
        this.clientEngine = parentGui.clientEngine
        this.renderer = this.clientEngine.renderer

        const GuiTooltip = (ui) => {
            return () => {
                const [_tooltip, setTooltip] = useState<any[]>([])
                useEffect(() => {
                    parentGui.listenTooltipObjects.subscribe(setTooltip)
                    // force combineLatest to emit first value
                    parentGui.currentScene?.objectsMoving.next({})
                }, [parentGui.currentScene])
                return parentGui.tooltipFilter(_tooltip).map(sprite => createElement('div', {
                    style: parentGui.tooltipPosition({ x: sprite.position.x, y: sprite.position.y }),
                    key: sprite.id,
                }, createElement(ui.gui, {
                    spriteData: sprite,
                    ...(ui.data || {}),
                })))
            }
        }

        const GuiWrapper = () => {
            const [_gui, setGui] = useState<any[]>([])
            useEffect(() => {
                this._gui.subscribe(gui => setGui(gui))
            }, [])
            return createElement(RpgReactContext.Provider, {
                value: parentGui.getInjectObject()
            },
                ..._gui.filter(ui => ui.display && !ui.attachToSprite).map(ui => createElement(ui.gui, {
                    key: ui.name,
                    ...(ui.data || {})
                })),
                ..._gui.filter(ui => ui.display && ui.attachToSprite).map(ui => createElement('div', {
                    key: ui.name
                }, createElement(GuiTooltip(ui)), null)),
            )
        }

        this.app.render(
            createElement(GuiWrapper, null)
        )
    }

    set gui(val) {
        let array: any = []
        for (let key in val) {
            // ignore vuejs component
            if (!val[key].isFunction) continue
            array.push(val[key])
        }
        this._gui.next(array)
    }
}