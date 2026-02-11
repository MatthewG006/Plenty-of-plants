'use server';

import { evolvePlantAction as evolvePlant } from './evolve-plant';
import { getImageDataUriAction as getImageDataUri } from './image-actions';

export const evolvePlantAction = evolvePlant;
export const getImageDataUriAction = getImageDataUri;
