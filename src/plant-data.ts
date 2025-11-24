
import type { PlantId } from '@/lib/types';

interface PlantData {
  name: string;
  description: string;
  chatCost: number;
}

export const प्लांट: Record<PlantId, PlantData> = {
  'plant-pothos': {
    name: 'Pothos',
    description: 'A hardy and popular houseplant with variegated leaves.',
    chatCost: 50,
  },
  'plant-snake': {
    name: 'Snake Plant',
    description: 'A low-maintenance succulent with sharp, architectural leaves.',
    chatCost: 60,
  },
  'plant-monstera': {
    name: 'Monstera',
    description: 'A trendy tropical plant with iconic, fenestrated leaves.',
    chatCost: 75,
  },
  'plant-cactus': {
    name: 'Cactus',
    description: 'A spiky desert plant that thrives on neglect.',
    chatCost: 40,
  },
  'plant-orchid': {
    name: 'Orchid',
    description: 'An elegant flowering plant that adds a touch of sophistication.',
    chatCost: 100,
  },
  'plant-zz': {
    name: 'ZZ Plant',
    description: 'A drought-tolerant plant with glossy, dark green leaves.',
    chatCost: 55,
  },
  'plant-fiddle-leaf': {
    name: 'Fiddle Leaf Fig',
    description: 'A stylish and dramatic plant with large, violin-shaped leaves.',
    chatCost: 90,
  },
  'plant-calathea': {
    name: 'Calathea',
    description: 'A vibrant plant with colorful, patterned leaves.',
    chatCost: 80,
  },
};
