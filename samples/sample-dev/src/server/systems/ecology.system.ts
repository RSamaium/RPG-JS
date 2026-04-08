import { H } from '../arelogic/heuristic.engine';

export function updateTile(tile:any){
 tile.resources += H[0] - H[6];
 if(tile.resources < 0) tile.biome = 'wasteland';
 return tile;
}
