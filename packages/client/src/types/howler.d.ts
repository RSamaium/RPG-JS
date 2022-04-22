declare module "howler" {

    class HowlerGlobal {
        stop(): HowlerGlobal
        mute(): HowlerGlobal;
        unmute(): HowlerGlobal;
        volume(): number;
        volume(volume: number): HowlerGlobal;
        codecs(extension: string): boolean;
        iOSAutoEnable: boolean;
    }

    var Howler: HowlerGlobal;

    interface IHowlCallback {
        (): void;
    }

    interface IHowlSoundSpriteDefinition {
        [name: string]: number[]
    }

    interface IHowlProperties {
        autoplay?: boolean;
        buffer?: boolean;
        format?: string;
        loop?: boolean;
        sprite?: IHowlSoundSpriteDefinition;
        volume?: number;
        src: string[]
        urls?: string[];
        onend?: IHowlCallback;
        onload?: IHowlCallback;
        onloaderror?: IHowlCallback;
        onpause?: IHowlCallback;
        onplay?: IHowlCallback;
    }

    class Howl {

        autoplay: Boolean;
        buffer: Boolean;
        format: string;
        rate: number;
        model: string;
        onend: IHowlCallback;
        onload: IHowlCallback;
        onloaderror: IHowlCallback;
        onpause: IHowlCallback;
        onplay: IHowlCallback;
        constructor(properties: IHowlProperties);
        play(sprite?: string, callback?: (soundId: number) => void): Howl;
        playing(): boolean
        pause(soundId?: number): Howl;
        stop(soundId?: number): Howl;
        mute(soundId?: number): Howl;
        unmute(soundId?: number): Howl;
        fade(from: number, to: number, duration: number, callback?: IHowlCallback, soundId?: number): Howl;
        loop(): boolean;
        loop(loop: boolean): Howl;
        pos(position?: number, soundId?: number): number;
        pos3d(x: number, y: number, z: number, soundId?: number): any;
        sprite(definition?: IHowlSoundSpriteDefinition): IHowlSoundSpriteDefinition;
        volume(): number;
        volume(volume?: number, soundId?: number): Howl;
        urls(): string[];
        urls(urls: string[]): Howl;
        on(event: string, listener?: () => void): Howl;
        off(event: string, listener?: () => void): Howl;
        unload(): void;
    }

}