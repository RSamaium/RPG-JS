import { validate } from '../arelogic/watchdog.engine';

export function handleAction(action:any){
 if(!validate(action)) return null;
 return action;
}
