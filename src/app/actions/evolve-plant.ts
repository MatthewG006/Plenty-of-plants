
'use server';

// This file is deprecated. The evolvePlant function from the AI flow is now called directly from the client component.
// This is done to simplify the architecture and avoid unnecessary server action layers.
// The file is kept to prevent breaking imports, but its content is no longer used.

export async function evolvePlantAction() {
    console.warn("evolvePlantAction is deprecated and should not be used.");
}
