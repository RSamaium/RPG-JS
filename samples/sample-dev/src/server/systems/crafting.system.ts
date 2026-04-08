import { H } from '../arelogic/heuristic.engine';

export function craftItem(_recipe:any){
 const tech = H[4] + 0.5;
 const production = H[0] + 0.5;
 
 const success = Math.random() < (tech * production);
 return {
  success,
  quality: success ? Math.floor(tech * 10) : 0,
  E: success ? [0,0.2,0,0,0.3,0,0,0,0,0,0,0,0.1] : [0,0,0,0,0.1,0,0,0,0,0,0,0,0]
 };
}
