
import type { Challenge } from '@/lib/types';

export const CHALLENGE_DATA: Challenge[] = [
  {
    id: 'water-5-plants',
    description: 'Water 5 plants',
    goal: 5,
    reward: 10,
  },
  {
    id: 'water-10-plants',
    description: 'Water 10 plants',
    goal: 10,
    reward: 20,
  },
  {
    id: 'get-a-new-plant',
    description: 'Get a new plant',
    goal: 1,
    reward: 15,
  },
  {
    id: 'login-3-days',
    description: 'Login 3 days in a row',
    goal: 3,
    reward: 30,
  },
  {
    id: 'reach-level-5',
    description: 'Reach level 5 with any plant',
    goal: 5,
    reward: 25,
  },
  {
    id: 'collect-50-gold',
    description: 'Collect 50 gold',
    goal: 50,
    reward: 5,
  },
];
