import { validate } from '../arelogic/watchdog.engine';
import { Graph } from '../arelogic/graph.engine';
import { getHistory } from '../persistence/event.log';

const globalGraph = new Graph();

export function handleAction(action:any){
 const result = validate(action, globalGraph, getHistory());
 if(!result.valid) {
    if (result.normalized) {
        return result.normalized;
    }
    return null;
 }

 const E = mapActionToE(action.type);
 updateHeuristics(E);

 return action;
}
