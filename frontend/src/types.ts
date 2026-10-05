export type Theme = 'light' | 'dark';
export type Language = 'pl' | 'en';

export interface PantryItem {
  id: number;
  name: string;
  quantity: number;
  unit: 'g' | 'szt' | 'ml';
  location: string;
  expirationDate: string;
}

export interface WorkoutPayload {
  goal: string;
  age: number;
  weight: number;
  activityLevel: string;
}

export interface Activity {
  id: number;
  activity_type: string;
  calories_burned: number;
  duration_minutes: number;
  date: string;
}

export interface UserProfile {
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goal?: string;
  activity_level?: string;
  dietary_preferences?: string;
}
