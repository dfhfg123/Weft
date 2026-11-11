export type NoteKind = 'thought' | 'question' | 'quote' | 'source';

export interface Note {
  id: string;
  text: string;
  kind: NoteKind;
  author?: string;
  threadId: string;
  x: number;
  y: number;
  width: number;
  createdAt: number;
}

export interface ThreadMeta {
  id: string;
  label: string;
  short: string;
  summary: string;
  color: string;
  isDynamic?: boolean;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  notes: Note[];
  threads: ThreadMeta[];
  throughline: string;
  tensionTitle: string;
  tension: string;
  openQuestion: string;
  createdAt: number;
}

export interface Workspace {
  boards: Board[];
  activeBoardId: string;
}

export interface ThreadView extends ThreadMeta {
  noteIds: string[];
  isDynamic: boolean;
}

export interface Connection {
  a: string;
  b: string;
  strength: number;
}

export interface Analysis {
  threads: ThreadView[];
  connections: Connection[];
  noteCount: number;
  throughline: string;
  tensionTitle: string;
  tension: string;
  openQuestion: string;
}

export interface AskResult {
  text: string;
  sources: string[];
  followUps: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  streaming?: boolean;
  question?: string;
  followUps?: string[];
  engine?: 'model' | 'local';
  interrupted?: boolean;
}
