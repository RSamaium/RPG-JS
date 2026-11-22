import { describe, it, expect } from 'vitest';
import { movementAt } from '../client/motion';
describe('movement presentation',()=>{
  it('clamps negative frame times and finished animations',()=>{
    const origin={x:4,y:5},path=[{x:4,y:4},{x:4,y:3}];
    expect(movementAt(origin,path,-.01)).toEqual(origin);
    expect(movementAt(origin,path,9)).toEqual(path[1]);
    expect(movementAt(origin,[],0)).toEqual(origin);
  });
  it('interpolates consecutive tiles without cutting corners',()=>{
    expect(movementAt({x:0,y:0},[{x:1,y:0},{x:1,y:1}],.225)).toEqual({x:.5,y:0});
    expect(movementAt({x:0,y:0},[{x:1,y:0},{x:1,y:1}],.675)).toEqual({x:1,y:.5});
  });
});
