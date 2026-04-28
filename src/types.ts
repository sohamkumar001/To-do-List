export enum View {
  HOME = 'home',
  TIMER = 'timer',
  AUDIO = 'audio',
  TASK = 'task',
  AI = 'ai'
}

export interface Task {
  id: number;
  title: string;
  desc: string;
  date: string;
}

export enum MascotState {
  IDLE = 'idle',
  CHEER = 'cheer'
}

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
}
