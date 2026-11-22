import { describe,it,expect } from 'vitest';
import { createEncounter } from './fixture';
import { transition,affected,targetable } from '../core/rules';
import { maskCells,skillArea,skillFor } from '../core/skills';
import { key } from '../core/board';
import { facingBetween,movementFacing,directionRow } from '../client/motion';

const start=()=>transition(createEncounter(),{type:'start'},'ally').state;
describe('selectable local skills',()=>{
  it('provides two distinct skills per class',()=>{
    for(const unit of createEncounter().units){expect(unit.skillIds).toHaveLength(2);expect(new Set(unit.skillIds).size).toBe(2);}
    expect(new Set(Object.values(createEncounter().skills).map(skill=>skill.visual)).size).toBe(6);
  });
  it('validates ownership, MP and target before consuming resources',()=>{
    const state=start(),unit=state.units[2];unit.y=3;
    const base={type:'skill' as const,unitId:unit.id,targetId:'enemy-mage'};
    const copy=structuredClone(state);
    expect(()=>transition(state,{...base,skillId:'astral-arrow'},'ally')).toThrow('tactical.error.action');
    expect(state).toEqual(copy);
    unit.sp=0;expect(()=>transition(state,{...base,skillId:'ember-nova'},'ally')).toThrow('tactical.error.sp');
    expect(unit.sp).toBe(0);
  });
  it('consumes only the chosen technique, preserving other choices next round',()=>{
    let state=start();state.units[2].y=3;
    const result=transition(state,{type:'skill',unitId:'ally-mage',targetId:'enemy-mage',skillId:'ember-nova'},'ally');
    expect(result.state.units[2].sp).toBe(10);expect(result.event.skillId).toBe('ember-nova');
    state=transition(result.state,{type:'endPhase'},'ally').state;
    state=transition(state,{type:'endPhase'},'enemy').state;
    expect(()=>transition(state,{type:'skill',unitId:'ally-mage',targetId:'enemy-mage',skillId:'ember-nova'},'ally')).toThrow('tactical.error.skill');
    state=transition(state,{type:'skill',unitId:'ally-mage',targetId:'enemy-mage',skillId:'frost-lance'},'ally').state;
    expect(state.units[2].sp).toBe(2);expect(state.units[2].usedSkills).toHaveLength(2);
  });
  it('uses exactly the previewed cells for AoE, excludes allies and clips board edges',()=>{
    const state=start(),mage=state.units[2];mage.x=1;mage.y=2;
    state.units[3].x=0;state.units[3].y=0;state.units[4].x=1;state.units[4].y=0;
    const skill=skillFor(state,mage,'ember-nova')!,target=state.units[3];
    const cells=skillArea(state,mage,target,skill);
    expect(cells).toHaveLength(4);
    const hits=affected(state,mage,target,skill.id);
    expect(hits.map(u=>u.id)).toEqual(['enemy-warrior','enemy-archer']);
    expect(hits.every(u=>cells.map(key).includes(key(u)))).toBe(true);
    state.board.blocked=['1,1'];expect(targetable(state,mage,target,skill.id)).toBe(false);
  });
  it('gives each technique its own range and damage',()=>{
    const state=start(),mage=state.units[2],target=state.units[5];
    expect(targetable(state,mage,target,'ember-nova')).toBe(false);
    expect(targetable(state,mage,target,'frost-lance')).toBe(true);
    const result=transition(state,{type:'skill',unitId:mage.id,targetId:target.id,skillId:'frost-lance'},'ally');
    expect(result.event.hits?.[0].damage).toBe(38);
  });
});
describe('Studio directional lanes',()=>{
  it('uses the actual Studio defaults, up for allies and down for enemies',()=>{
    expect(directionRow.up).toBe(0);expect(directionRow.down).toBe(2);
    expect(facingBetween({x:0,y:0},{x:1,y:0},'up')).toBe('right');
    expect(facingBetween({x:0,y:0},{x:-1,y:0},'up')).toBe('left');
  });
  it('turns at path corners and retains the last facing after arrival',()=>{
    const origin={x:0,y:2},path=[{x:0,y:1},{x:1,y:1},{x:1,y:2}];
    expect(movementFacing(origin,path,-.1,'up')).toBe('up');
    expect(movementFacing(origin,path,.4,'up')).toBe('right');
    expect(movementFacing(origin,path,1,'up')).toBe('down');
  });
  it('hits the tiles a Studio area draws around the target, the middle of its rows being the target',()=>{
    expect(maskCells(['.#.','###','.#.'],{x:4,y:4}).map(key).sort()).toEqual(['3,4','4,3','4,4','4,5','5,4']);
    const state=start(),mage=state.units[2],skill={...skillFor(state,mage,'ember-nova')!,mask:['#.#','...','#.#']};
    expect(skillArea(state,mage,{x:3,y:3},skill).map(key).sort()).toEqual(['2,2','2,4','4,2','4,4']);
  });
});
