
# Plenty of Plants - Application Documentation

## 1. Introduction

"Plenty of Plants" is a progressive web app (PWA) built with Next.js where users can collect, grow, and manage a collection of digital, AI-generated plants. The application is designed as a mobile-first experience, featuring a persistent audio-visual environment, sound effects for interactivity, and local data storage to maintain the user's collection across sessions.

The core gameplay loop involves users "drawing" new plants using a limited number of daily draws. These draws trigger a Genkit AI flow to generate a unique plant with a name, description, and image.

## 2. Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Generative AI**: [Firebase Genkit](https://firebase.google.com/docs/genkit) (with Google AI)
- **State Management**: React Hooks (`useState`, `useEffect`, `useContext`) and local browser storage.
- **Drag & Drop**: [`@dnd-kit/core`](https://dndkit.com/)

---

## 3. File Structure

The project is organized to separate concerns, with distinct directories for routing, UI components, AI logic, and shared utilities.

```
.
├── public/
│   ├── fallback-plants/  # Fallback images for AI generation failures
│   ├── music/            # Background music files
│   └── sfx/              # Sound effect files
├── src/
│   ├── ai/
│   │   ├── flows/
│   │   │   ├── draw-plant-flow.ts       # Main AI flow for generating a new plant
│   │   │   └── get-fallback-plant-flow.ts # Failsafe flow for when generation fails
│   │   ├── dev.ts            # Entrypoint for running Genkit locally
│   │   └── genkit.ts         # Genkit AI configuration
│   ├── app/
│   │   ├── (app)/            # Route group for authenticated app screens
│   │   │   ├── community/
│   │   │   ├── home/
│   │   │   ├── profile/
│   │   │   ├── room/
│   │   │   ├── settings/
│   │   │   ├── shop/
│   │   │   └── layout.tsx    # Layout with bottom navigation for the main app
│   │   ├── login/
│   │   │   └── page.tsx      # Splash screen with "Tap to Enter"
│   │   ├── signup/
│   │   │   └── page.tsx      # User account creation page
│   │   ├── globals.css       # Global styles and Tailwind CSS theme variables
│   │   ├── layout.tsx        # Root layout for the entire application
│   │   └── page.tsx          # Login/authentication page
│   ├── components/
│   │   ├── ui/               # Auto-generated ShadCN UI components
│   │   ├── bottom-nav-bar.tsx  # The main navigation bar at the bottom
│   │   ├── music-player.tsx    # Component to handle background music playback
│   │   └── ...
│   ├── context/
│   │   └── AudioContext.tsx  # React Context for managing audio state (music & SFX)
│   ├── hooks/
│   │   ├── use-mobile.tsx    # Hook to detect if the user is on a mobile device
│   │   └── use-toast.ts      # Hook for displaying toast notifications
│   ├── interfaces/
│   │   └── plant.ts          # TypeScript interface for the Plant object
│   └── lib/
│       ├── draw-manager.ts   # Logic for managing user draws (counting, refilling)
│       └── utils.ts          # Utility functions (e.g., `cn` for classnames)
└── ...
```

---

## 4. Core Features & Logic

### 4.1. Authentication and User Data

- **Files**: `src/app/page.tsx`, `src/app/signup/page.tsx`, `src/app/(app)/profile/page.tsx`
- **Mechanism**: The app uses a simplified, pseudo-authentication system that relies on **`localStorage`**.
  - On the login page (`/`), the user enters an email. The `handleLogin` function in `src/app/page.tsx` stores this email along with a generated username and Game ID in `localStorage` under the key `plenty-of-plants-user`.
  - The signup page (`/signup`) works similarly, creating a new user object.
  - The profile page (`/profile`) reads from this `localStorage` key to display user information.
  - Logging out simply removes this key from `localStorage`.

### 4.2. Audio System

- **Files**: `src/context/AudioContext.tsx`, `src/components/music-player.tsx`, `src/components/ui/button.tsx`
- **Mechanism**:
  - **`AudioContext`**: This is the heart of the audio system. It manages the state for background music (`isPlaying`, `volume`) and sound effects (`sfxVolume`). It provides a `playSfx` function that can play different pre-defined sounds (`tap`, `whoosh`, `chime`, etc.).
  - **`MusicPlayer`**: A simple component, placed in the root layout, that contains the `<audio>` element for the background music. It uses the `AudioContext` to control playback and volume.
  - **`Button` Component**: The custom `Button` component is enhanced to automatically call `playSfx('tap')` on every click, providing instant auditory feedback across the app. A `disableSfx` prop is available to prevent this behavior where needed (e.g., the splash screen button).
  - **Autoplay**: The music is triggered by the first user interaction on the splash screen (`/login/page.tsx`) to comply with browser autoplay policies.

### 4.3. AI Plant Generation

- **Files**: `src/ai/flows/draw-plant-flow.ts`, `src/ai/flows/get-fallback-plant-flow.ts`, `src/ai/genkit.ts`
- **Mechanism**:
  - **`genkit.ts`**: Configures the Genkit instance, specifying the `googleAI` plugin. It's set up to gracefully handle a missing `GOOGLE_API_KEY`.
  - **`drawPlantFlow`**: This is the primary AI flow.
    1. It first calls `plantDetailsPrompt` to generate a name, description, and an image prompt for a new plant.
    2. It then uses the generated `imagePrompt` to call the Gemini image generation model.
    3. The resulting image (a data URI) and the text details are bundled into the `DrawPlantOutput`.
    4. A `try...catch` block ensures that if any part of this process fails (e.g., API key missing, quota exceeded), it calls the `getFallbackPlant` function.
  - **`getFallbackPlantFlow`**: This is a robust failsafe.
    1. It uses an AI prompt to randomly pick a plant type (`cactus`, `flower`, `succulent`) and generate a name/description for it. This avoids server-side randomness.
    2. It reads the corresponding pre-packaged PNG image from `/public/fallback-plants/` and converts it to a data URI.
    3. It includes its own `try...catch` block. If the AI text generation fails, it returns a hardcoded plant name and a transparent pixel, ensuring the app never crashes.

### 4.4. Plant Drawing and Collection

- **Files**: `src/app/(app)/home/page.tsx`, `src/app/(app)/room/page.tsx`, `src/lib/draw-manager.ts`
- **Mechanism**:
  - **Draw Management (`draw-manager.ts`)**:
    - Manages the number of available draws in `localStorage` under `plenty-of-plants-draws`.
    - `loadDraws`: Checks the time since the last draw was used and replenishes draws based on a 12-hour interval.
    - `useDraw`: Decrements the draw count.
    - `claimFreeDraw`: Allows users to get more draws from the shop.
  - **Drawing a Plant (`home/page.tsx`)**:
    - The "Draw New Plant" button on the home page is the main trigger.
    - The `handleDraw` function calls the `drawPlant` server action from the AI flow.
    - Before saving, it runs the generated image through a `compressImage` helper function to reduce its size, which is critical for `localStorage` which has a limited capacity.
    - The newly drawn plant is displayed in a dialog, and upon closing, the `handleCollect` function saves it.
  - **Saving Plants (`localStorage`)**:
    - All plant data is stored in `localStorage` under the key `plenty-of-plants-data`.
    - This object contains two arrays: `desk` (for plants on display) and `collection` (for all other plants).

### 4.5. The Room (Drag and Drop)

- **File**: `src/app/(app)/room/page.tsx`
- **Mechanism**:
  - **State**: The page manages two pieces of state: `deskPlants` (an array of `Plant | null`) and `collectedPlants` (an array of `Plant`).
  - **Rendering**: It renders the `deskPlants` in droppable "pot" areas and the `collectedPlants` in a grid below.
  - **`@dnd-kit`**:
    - `DndContext`: Wraps the entire page to provide the drag-and-drop context.
    - `useDraggable`: Used on each plant (`DraggablePlant`) to make it movable. It attaches the plant's data (ID and source).
    - `useDroppable`: Used on the pots (`DroppablePot`) and the main collection area (`DroppableCollectionArea`) to make them valid drop targets.
  - **`handleDragEnd`**: This function contains the core logic. When a drag action finishes, it inspects the `active` (dragged) and `over` (dropped on) elements to determine how to update the `deskPlants` and `collectedPlants` arrays, then saves the new state to `localStorage`.

---
