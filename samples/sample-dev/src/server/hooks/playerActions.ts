import { validate } from '../arelogic/watchdog.engine';
import { mapActionToE } from '../arelogic/event.mapper';
import { updateHeuristics } from '../arelogic/heuristic.engine';

export function handleAction(action:any){
 const result = validate(action);
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
