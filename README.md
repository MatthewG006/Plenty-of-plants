

import { streamObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import {
  FetchBusinessReviewsInput,
  FetchBusinessReviewsInputSchema,
  GoogleReviewsData, // Import the new explicit type
} from '@/lib/types'

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge'

// Define the Zod schema for the AI output locally. This is for validation.
const AIOutputSchema = z.object({
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  reviews: z.array(
    z.object({
      author_name: z.string(),
      rating: z.number(),
      relative_time_description: z.string(),
      text: z.string(),
      profile_photo_url: z.string(),
      url: z.string().optional(),
    })
  ),
})

// Update the function to use the explicit return type
export async function fetchBusinessReviews(
  input: FetchBusinessReviewsInput
): Promise<GoogleReviewsData> { // Use the explicit type here
  const validatedInput = FetchBusinessReviewsInputSchema.parse(input)

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })

  const businessQuery = validatedInput.placeId
    ? `placeId: ${validatedInput.placeId}`
    : `${validatedInput.businessName}, ${validatedInput.businessAddress}, ${validatedInput.city}, ${validatedInput.state} ${validatedInput.zip}`

  const { partialObjectStream } = streamObject({
    model: google('models/gemini-1.5-flash-latest'),
    system: 'You are an expert business researcher. Your task is to find a business on Google Maps and extract its reviews. If the business is not found, return an empty array for the reviews.',
    prompt: `Find the business with the following details: ${businessQuery}. Then, extract the top 5 most relevant reviews, the overall rating, and the total number of reviews.`,
    schema: AIOutputSchema,
  })

  let finalObject: GoogleReviewsData = {
    reviews: [],
    rating: 0,
    reviewCount: 0,
  }

  // Stream the object and update finalObject
  for await (const partialObject of partialObjectStream) {
    finalObject = partialObject as GoogleReviewsData
  }

  return finalObject
}
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
