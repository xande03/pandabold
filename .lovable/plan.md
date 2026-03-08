

# OmniArena AI - Multi-Modal AI Platform

## Overview
A single-page AI platform with 6 modules, built with React + Vite + Tailwind CSS + shadcn/ui. Backend powered by Supabase Edge Functions calling the Lovable AI Gateway for chat and image generation.

## Design System
- **Theme**: Orange/red gradient primary (`#ea580c` → `#dc2626`), dark mode with deep blue background (`#0f172a`)
- **Style**: Glassmorphism cards, gradient buttons, pulse-glow effects
- **Font**: Geist Sans + Geist Mono
- **Responsive**: Mobile-first with bottom navigation on mobile, top tabs on desktop

## Layout & Navigation
- **Fixed header** with glassmorphism effect, logo with pulse glow, module tabs, dark/light toggle
- **Mobile bottom nav** with icon + label for each module
- **Single page** — all 6 modules switch via tabs/state (no routing)

## Module 1: Chat Arena
- Compare two AI models side-by-side (Battle mode) or chat with one (Individual mode)
- Model selector dialog with filter by provider
- Available models via Lovable AI Gateway: Gemini (2.5 Pro, Flash, Flash-Lite), GPT-5 variants
- Streaming responses with token-by-token rendering
- Vote system, copy responses, conversation history, reset

## Module 2: Image Lab
- Generate images from text prompts using Lovable AI's image models (Gemini Flash Image, Gemini 3 Pro Image)
- Optional reference image upload (image-to-image)
- Aspect ratio selector (1:1, 16:9, 9:16, 2:1, 4:3, 3:4)
- 9 preset styles (Photorealistic, Digital Art, Anime, Cyberpunk, etc.)
- Gallery of generated images with download, fullscreen preview, prompt copy

## Module 3: Image Editor
- Upload image via drag & drop
- 6 edit operations: Add, Remove, Modify, Style, Enhance, Background
- Uses Lovable AI image editing capability
- Before/after comparison dialog
- Output size selection
- Gallery of edits with download

## Module 4: Video Studio
- Text-to-video prompt interface (UI only — placeholder for future video API integration)
- Image-to-video option with upload
- Duration, resolution, quality, and style selectors
- Task cards with processing status and progress bars
- Video player for completed results
- **Note**: Actual video generation will be simulated/mocked since Lovable AI Gateway doesn't support video generation yet

## Module 5: QR Code Generator
- 5 content types: Link, Text, Image, Music, PDF
- File upload with preview for media types
- QR code generation (client-side using a QR library)
- Download as PNG, copy to clipboard
- History of generated QR codes

## Module 6: Music DNA
- Upload audio file (MP3, WAV, etc.) or paste YouTube URL
- AI-powered analysis via Lovable AI: genres, mood, tempo/BPM, instruments, vocals, structure, similar artists/songs
- Visual results with confidence bars, badges, instrument grid
- Audio player preview

## Backend (Supabase Edge Functions)
- **`chat`** — Streams responses from Lovable AI Gateway with model selection
- **`generate-image`** — Calls Lovable AI image generation (Gemini image models)
- **`edit-image`** — Calls Lovable AI for image editing
- **`analyze-music`** — Sends audio metadata to Lovable AI for analysis
- **`generate-qrcode`** — Server-side QR code generation
- All functions include CORS headers, rate limit handling (429/402), and error responses

## State Management
- Zustand store for active module, chat history, generated assets, settings
- Local component state for form inputs and UI interactions

## PWA
- `manifest.json` with app name, icons, shortcuts, theme color
- Basic service worker for offline caching of static assets

