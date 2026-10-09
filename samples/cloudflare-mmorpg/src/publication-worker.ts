import { createServer, provideServerModules } from '@rpgjs/server';
import { createRpgServerWorker, RpgServerDurableObject, RpgPublicationDurableObject } from '@rpgjs/server/cloudflare';

export { RpgServerDurableObject, RpgPublicationDurableObject };
export default createRpgServerWorker(createServer({ providers: [provideServerModules([])] }), {
  binding: 'RPGJS_ROOMS',
  publication: { bucket: 'GAME_DATA', coordinator: 'PUBLICATIONS' },
});
