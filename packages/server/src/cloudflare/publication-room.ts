import { setMapSourceStorage } from '../map-source-storage';
import {
  getMapOwner, readManifest, readPublicationMap,
  type RpgPublicationHead, type RpgPublicationManifest,
} from './publication';
import { coordinatorRequest, publicationBindings } from './publication-coordinator';

interface Room {
  id?: string;
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<unknown>;
  };
}
interface Pointer extends RpgPublicationHead { projectId: string }
const pointerKey = '$room:rpgjs-publication';
const legacyKey = '$room:rpgjs-map-source';

export class PublicationRoom {
  private session = crypto.randomUUID();
  private project: Promise<string | null> | undefined;
  private loaded: RpgPublicationManifest | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private unusable = false;
  private registered = false;
  private readonly mapId: string;

  constructor(private readonly room: Room, private readonly env: Record<string, unknown>,
    private readonly apply: (source: Record<string, unknown>) => Promise<void>,
    private readonly active: () => boolean,
  ) {
    this.mapId = room.id!.slice(4);
    setMapSourceStorage(room, {
      get: async () => {
        const pointer = await room.storage.get<Pointer>(pointerKey);
        if (!pointer) return room.storage.get(legacyKey);
        const { bucket } = publicationBindings(env);
        return readPublicationMap(bucket, await readManifest(bucket, pointer.projectId, pointer.manifest), this.mapId);
      },
      put: async value => {
        if (!await this.owner()) await room.storage.put(legacyKey, value);
        // Managed maps persist their reference only after successful application.
      },
    });
  }

  private owner(): Promise<string | null> {
    // A legacy room may be enrolled later; do not permanently cache a miss.
    return this.project ??= getMapOwner(publicationBindings(this.env).bucket, this.mapId).then(owner => {
      if (!owner) this.project = undefined;
      return owner;
    }).catch(error => { this.project = undefined; throw error; });
  }

  async isManaged(): Promise<boolean> { return (await this.owner()) !== null; }

  private async request(projectId: string, action: string, revision?: number, retired = false, session: string = this.session): Promise<RpgPublicationHead> {
    const response = await coordinatorRequest(this.env, projectId, `/${action}`, {
      mapId: this.mapId, session, ...(revision === undefined ? {} : { revision }),
      ...(retired ? { retired } : {}),
    });
    if (!response.ok) throw new Error('Publication coordinator unavailable');
    if (action === 'register') this.registered = true;
    if (action === 'leave') this.registered = false;
    return response.json() as Promise<RpgPublicationHead>;
  }

  async connect(): Promise<void> {
    await this.serial(async () => {
      const projectId = await this.owner();
      if (!projectId) return;
      const head = await this.request(projectId, 'register');
      try { await this.load(projectId, head, true); }
      catch (error) {
        if (!this.active()) await this.request(projectId, 'leave');
        throw error;
      }
    });
  }

  async disconnect(): Promise<void> {
    await this.serial(async () => {
      const projectId = await this.owner();
      if (projectId && !this.active()) await this.request(projectId, 'leave');
    });
  }

  async refresh(notifiedSession?: string): Promise<void> {
    await this.serial(async () => {
      const projectId = await this.owner();
      if (!projectId) return;
      if (!this.active()) { await this.request(projectId, 'leave', undefined, false, notifiedSession); return; }
      // Resolve the latest head instead of trusting the notification's revision.
      const head = await this.request(projectId, this.registered ? 'head' : 'register');
      await this.load(projectId, head, false);
    });
  }

  async ready(): Promise<void> {
    await this.queue;
    if (this.unusable) throw new Error('Room publication requires recovery');
    if (!this.loaded && await this.isManaged()) await this.refresh();
  }

  private serial(work: () => Promise<void>): Promise<void> {
    const pending = this.queue.then(work);
    this.queue = pending.catch(() => undefined);
    return pending;
  }

  private async load(projectId: string, head: RpgPublicationHead, joining: boolean): Promise<void> {
    const { bucket } = publicationBindings(this.env);
    const next = await readManifest(bucket, projectId, head.manifest);
    const previous = await this.room.storage.get<Pointer>(pointerKey);
    if (!Object.hasOwn(next.maps, this.mapId)) {
      if (joining) throw new Error('Map is no longer published');
      if (!this.loaded && previous) {
        const old = await readManifest(bucket, projectId, previous.manifest);
        await this.apply(await readPublicationMap(bucket, old, this.mapId));
        this.loaded = old;
      }
      // Existing occupants keep their current version; fresh entrants are denied.
      await this.request(projectId, 'ack', head.revision, true);
      return;
    }
    if (!this.unusable && this.loaded?.maps[this.mapId] === next.maps[this.mapId]
      && this.loaded.shared === next.shared && this.loaded.startMapId === next.startMapId) {
      await this.room.storage.put(pointerKey, { ...head, projectId });
      this.loaded = next;
      await this.request(projectId, 'ack', head.revision);
      return;
    }
    const source = await readPublicationMap(bucket, next, this.mapId);
    try {
      await this.apply(source);
      await this.room.storage.put(pointerKey, { ...head, projectId });
    } catch (error) {
      this.unusable = true;
      if (previous) {
        try {
          const old = await readManifest(bucket, projectId, previous.manifest);
          await this.apply(await readPublicationMap(bucket, old, this.mapId));
          this.loaded = old;
          this.unusable = false;
        } catch { /* Keep the old durable pointer and reject gameplay until retry succeeds. */ }
      }
      throw error;
    }
    this.loaded = next;
    this.unusable = false;
    // Remove the legacy source only after a durable version reference exists.
    await this.room.storage.delete(legacyKey);
    await this.request(projectId, 'ack', head.revision);
  }
}
