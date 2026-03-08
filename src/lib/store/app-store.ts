import { create } from 'zustand';

export type ModuleId = 'chat' | 'image' | 'editor' | 'video' | 'qrcode' | 'music' | 'gallery' | 'summarizer' | 'signature' | 'upscale';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: number;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  model: string;
  size: string;
  style?: string;
  creationModel?: string;
  timestamp: number;
}

export interface EditedImage {
  id: string;
  originalUrl: string;
  editedUrl: string;
  operation: string;
  prompt: string;
  timestamp: number;
}

export interface VideoTask {
  id: string;
  prompt: string;
  model: string;
  status: 'processing' | 'success' | 'fail';
  progress: number;
  frames: string[];
  videoUrl?: string;
  timestamp: number;
}

export interface QRCodeItem {
  id: string;
  type: string;
  content: string;
  qrUrl: string;
  timestamp: number;
}

export interface UpscaledImage {
  id: string;
  originalUrl: string;
  upscaledUrl: string;
  scale: string;
  description: string;
  timestamp: number;
}

export interface MusicAnalysis {
  genres: Array<{ name: string; confidence: number }>;
  moods: Array<{ name: string; confidence: number }>;
  tempo: { bpm: number; confidence: number };
  instruments: Array<{ name: string; presence: number }>;
  vocals: {
    type: string;
    gender: string;
    characteristics: string[];
    confidence: number;
  };
  structure: {
    sections: Array<{ name: string; duration: string; timestamp: string }>;
  };
  similarArtists: Array<{ name: string; similarity: number }>;
  similarSongs: Array<{ title: string; artist: string; similarity: number }>;
  lyrics?: string;
  overallConfidence: number;
}

interface AppState {
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  
  chatHistoryA: ChatMessage[];
  chatHistoryB: ChatMessage[];
  setChatHistoryA: (msgs: ChatMessage[]) => void;
  setChatHistoryB: (msgs: ChatMessage[]) => void;
  addChatMessageA: (msg: ChatMessage) => void;
  addChatMessageB: (msg: ChatMessage) => void;
  updateLastAssistantA: (content: string) => void;
  updateLastAssistantB: (content: string) => void;
  clearChatA: () => void;
  clearChatB: () => void;
  
  generatedImages: GeneratedImage[];
  addGeneratedImage: (img: GeneratedImage) => void;
  
  editedImages: EditedImage[];
  addEditedImage: (img: EditedImage) => void;
  
  videoTasks: VideoTask[];
  addVideoTask: (task: VideoTask) => void;
  updateVideoTask: (id: string, updates: Partial<VideoTask>) => void;
  
  qrCodes: QRCodeItem[];
  setQRCodes: (qrs: QRCodeItem[]) => void;
  addQRCode: (qr: QRCodeItem) => void;

  upscaledImages: UpscaledImage[];
  addUpscaledImage: (img: UpscaledImage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'chat',
  setActiveModule: (module) => set({ activeModule: module }),
  isDark: true,
  setIsDark: (dark) => set({ isDark: dark }),
  
  chatHistoryA: [],
  chatHistoryB: [],
  setChatHistoryA: (msgs) => set({ chatHistoryA: msgs }),
  setChatHistoryB: (msgs) => set({ chatHistoryB: msgs }),
  addChatMessageA: (msg) => set((s) => ({ chatHistoryA: [...s.chatHistoryA, msg] })),
  addChatMessageB: (msg) => set((s) => ({ chatHistoryB: [...s.chatHistoryB, msg] })),
  updateLastAssistantA: (content) => set((s) => {
    const msgs = [...s.chatHistoryA];
    const last = msgs[msgs.length - 1];
    if (last?.role === 'assistant') msgs[msgs.length - 1] = { ...last, content };
    return { chatHistoryA: msgs };
  }),
  updateLastAssistantB: (content) => set((s) => {
    const msgs = [...s.chatHistoryB];
    const last = msgs[msgs.length - 1];
    if (last?.role === 'assistant') msgs[msgs.length - 1] = { ...last, content };
    return { chatHistoryB: msgs };
  }),
  clearChatA: () => set({ chatHistoryA: [] }),
  clearChatB: () => set({ chatHistoryB: [] }),
  
  generatedImages: [],
  addGeneratedImage: (img) => set((s) => ({ generatedImages: [img, ...s.generatedImages] })),
  
  editedImages: [],
  addEditedImage: (img) => set((s) => ({ editedImages: [img, ...s.editedImages] })),
  
  videoTasks: [],
  addVideoTask: (task) => set((s) => ({ videoTasks: [task, ...s.videoTasks] })),
  updateVideoTask: (id, updates) => set((s) => ({
    videoTasks: s.videoTasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),
  
  qrCodes: [],
  setQRCodes: (qrs) => set({ qrCodes: qrs }),
  addQRCode: (qr) => set((s) => ({ qrCodes: [qr, ...s.qrCodes] })),
}));
