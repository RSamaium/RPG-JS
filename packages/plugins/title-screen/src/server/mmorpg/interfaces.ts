export interface UserAuth { 
    message: string;
    user: User;
    token: string;
    exp: number;
  }
  export interface Game { 
    value: string;
    relationTo: string;
  }
  export interface User { 
    game: Game;
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    nickname?: string;
    data?: string
  }
  