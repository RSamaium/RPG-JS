export function validate(action:any){
 if(!action) return false;
 if(action.value && action.value < 0) return false;
 if(action.type === 'trade' && action.price <= 0) return false;
 return true;
}
