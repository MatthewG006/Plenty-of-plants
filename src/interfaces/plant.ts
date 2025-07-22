
export interface Plant {
  id: number;
  name: string;
  form: string;
  image: string;
  hint: string;
  description: string;
  level: number;
  xp: number;
  lastWatered: number[];
  hasGlitter?: boolean;
}

    