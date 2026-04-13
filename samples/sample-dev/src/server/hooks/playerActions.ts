import { validate } from '../arelogic/watchdog.engine';

export function handleAction(action:any){
 const result = validate(action);
 if(!result.valid) {
    if (result.normalized) {
        return result.normalized;
    }
    return null;
 }
 return action;
}
