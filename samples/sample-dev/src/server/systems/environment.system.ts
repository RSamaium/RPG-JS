import { updateHeuristics } from '../arelogic/heuristic.engine';

export type WeatherType = 'clear' | 'rain' | 'storm' | 'fog';

export interface WorldState {
  time: number; // 0 to 1440 (minutes in a day)
  weather: WeatherType;
  day: number;
}

const state: WorldState = {
  time: 480, // Start at 8:00 AM
  weather: 'clear',
  day: 1
};

export function updateWorldState() {
  // 1 real second = 10 in-game minutes (2.4 minutes real time = 1 in-game day)
  state.time += 10;
  if (state.time >= 1440) {
    state.time = 0;
    state.day++;
  }

  // Random weather changes
  if (Math.random() > 0.98) {
    const weathers: WeatherType[] = ['clear', 'rain', 'storm', 'fog'];
    state.weather = weathers[Math.floor(Math.random() * weathers.length)];
  }

  // Axiom A5: Environment affects heuristics
  const E = new Array(13).fill(0);
  
  // Night (20:00 to 04:00) increases Chaos (H11)
  if (state.time > 1200 || state.time < 240) {
    E[11] += 0.05;
  }
  
  // Weather impacts
  if (state.weather === 'storm') {
    E[8] += 0.1; // Conflict up
    E[7] += 0.05; // Famine/Hunger up
  } else if (state.weather === 'rain') {
    E[0] += 0.05; // Resources/Production up (growth)
  }

  updateHeuristics(E);
  return state;
}

export function getWorldState() {
  return state;
}
