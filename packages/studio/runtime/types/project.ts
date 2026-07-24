type ParamCurve = {
  start: number;
  end: number;
};

type ParamValue = ParamCurve | number;

export type ProjectBasic = {
  combatAudio?: {
    battleMusic?: string;
    attack?: string;
    skill?: string;
    hit?: string;
    hurt?: string;
    die?: string;
    fadeInMs?: number;
    fadeOutMs?: number;
    exitDelayMs?: number;
  };
  initialLevel?: number;
  finalLevel?: number;
  hitbox?: {
    width: number;
    height: number;
  };
  expCurve?: {
    basis: number;
    extra: number;
    accelerationA: number;
    accelerationB: number;
  };
  parameters?: Record<string, ParamValue>;
  startingInventory?: Array<{
    itemId?: string;
    amount: number;
  }>;
  skillsToLearn?: Array<{
    level?: number;
    skill?: string;
    skillId?: string;
  }>;
  skills?: Array<{
    level?: number;
    skill?: string;
    skillId?: string;
  }>;
  startingEquipment?: Record<string, string>;
  animations?: {
    attack?: string;
    hurt?: string;
    die?: string;
    castSkill?: string;
    castSpell?: string;
  };
};
