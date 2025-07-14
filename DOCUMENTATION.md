# Plenty of Plants - Application Documentation

## 1. Introduction

"Plenty of Plants" is a progressive web app (PWA) built with Next.js where users can collect, grow, and manage a collection of digital, AI-generated plants. The application is designed as a mobile-first experience, featuring a persistent audio-visual environment, sound effects for interactivity, and local data storage to maintain the user's collection across sessions.

The core gameplay loop involves users "drawing" new plants using a limited number of daily draws. These draws trigger a Genkit AI flow to generate a unique plant with a name, description, and image.

## 2. Technology Stack

- **Framework**: Next.js (with App Router)
- **Language**: TypeScript
- **UI Components**: ShadCN UI
- **Styling**: Tailwind CSS
- **Generative AI**: Firebase Genkit (with Google AI)
- **State Management**: React Hooks and local browser storage.
- **Drag & Drop**: The `@dnd-kit/core` library is used for moving plants.

---

## 3. File Structure Overview

The project is organized to separate different parts of the application. There are specific folders for AI-powered features, different pages of the app (like the home screen or shop), UI components (like buttons and cards), and core logic (like managing audio or game rules). This separation makes the project easier to maintain and understand.

---

## 4. Core Features & Logic

### 4.1. Authentication and User Data

The app uses a simplified authentication system that relies entirely on the user's browser storage (`localStorage`). When a user logs in or signs up, their email and a generated username are saved on their device. The profile page reads this saved information to display it. Logging out simply removes this data from the browser's storage. This logic is primarily handled on the login, signup, and profile pages.

### 4.2. Audio System

The audio system is managed globally to ensure music and sound effects are consistent across the entire app.

- **Audio Context**: A central piece of logic, located in `src/context/AudioContext.tsx`, manages the state of the background music (if it's playing, its volume) and sound effects. It provides a function that other parts of the app can call to play specific sounds like a "tap" or "whoosh".

- **Music Player**: A dedicated component in `src/components/music-player.tsx` handles the actual playback of the background music file. It's placed in the root layout of the app so it's always present.

- **Button Sound Effects**: The standard `Button` component has been modified to automatically play a "tap" sound effect on every click, providing instant auditory feedback. This logic is built directly into the component file at `src/components/ui/button.tsx`. The first user interaction on the splash screen is used to start the music, complying with modern browser autoplay policies.

### 4.3. AI Plant Generation

The core of the game involves generating unique plants using AI. This is handled by "flows" located in the `src/ai/flows/` directory.

- **Main Drawing Flow**: When a user draws a new plant, a flow named `drawPlantFlow` is triggered. This flow first asks the AI to generate text details for a plant (like a name and description). It then uses a second AI call to generate an image based on those details.

- **Fallback System**: If the main AI image generation fails for any reason (like a missing API key or a service outage), the `drawPlantFlow` has a built-in safety net. It calls a separate `getFallbackPlantFlow`. This secondary flow provides a pre-made plant image from a folder of fallback options (`public/fallback-plants/`) and uses a simpler AI prompt to generate a new name and description. This ensures the user always receives a plant and the app doesn't crash.

### 4.4. Plant Drawing and Collection

The system for managing how many plants a user can draw is handled by a dedicated `draw-manager.ts` file.

- **Draw Management**: This file contains the logic for tracking the number of available draws in the user's browser storage. It handles replenishing draws over time (every 12 hours) and allows the user to claim free draws from the shop.

- **Drawing a Plant**: On the Home page, the "Draw New Plant" button triggers the AI generation process. Before a new plant is saved, its image is compressed to a smaller size. This is crucial because browser storage is limited.

- **Saving Plants**: All collected plant data, including the compressed images, is saved in the user's browser storage. The data is split into two lists: `desk` for plants currently on display in the user's room, and `collection` for all other plants.

### 4.5. The Room (Drag and Drop)

The "Room" page, located at `src/app/(app)/room/page.tsx`, is where users can view and arrange their collected plants.

- **Display**: The page displays the plants from the `desk` list in a series of "pots" and shows the rest of the `collection` in a grid below.

- **Drag and Drop**: The page uses the `@dnd-kit` library to allow users to drag their plants. Users can drag plants from their collection into an empty pot on the desk, swap plants between pots, or move a plant from the desk back into the collection. After any change is made, the updated arrangement is immediately saved to the user's browser storage.
