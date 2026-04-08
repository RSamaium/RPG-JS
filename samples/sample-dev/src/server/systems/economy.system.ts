import { H } from '../arelogic/heuristic.engine';

export function computePrice(_item:any){
 const demand = H[2] + 1;
 const supply = H[0] + 1;
 return demand / supply;
}
