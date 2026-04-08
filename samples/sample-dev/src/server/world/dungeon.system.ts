import { H } from '../arelogic/heuristic.engine';

export function generateDungeon(level:number){
 const rooms = 5 + Math.floor(H[5]*10);
 const layout = [];
 for(let i=0;i<rooms;i++){
  layout.push({id:i,type:Math.random()>0.8?'boss':'mob',loot:level*H[2]});
 }
 return { id:Date.now(), layout, level, reborn:H[12]>0.5 };
}
