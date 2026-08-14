type ParamCurve = {
  start: number;
  end: number;
};

type ParamValue = ParamCurve | number;

export type ProjectBasic = {
  audio?: {
    ui?: {
      navigate?: string;
      confirm?: string;
      cancel?: string;
      open?: string;
      close?: string;
      error?: string;
    };
  };
  menus?: {
    titleScreen?: {
      enabled: boolean;
      guiId?: string | null;
      settings: {
        backgroundMusic?: string | null;
        backgroundImage?: string | null;
      };
    };
    hotbar?: {
      enabled: boolean;
      guiId?: string | null;
      settings: {
        content: "skills" | "items" | "mixed";
        slotCount: number;
      };
    };
    hud?: {
      enabled: boolean;
      guiId?: string | null;
    };
    mainMenu?: {
      enabled: boolean;
      guiId?: string | null;
    };
  };
  combatAudio?: {
    battleMusic?: string;
    attack?: string;
    skill?: string;
    hit?: string;
    hurt?: string;
    die?: string;
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
