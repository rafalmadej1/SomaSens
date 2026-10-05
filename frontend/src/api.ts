import type { PantryItem, Activity, UserProfile } from './types';

const API_BASE = 'http://127.0.0.1:8000';

// Helper function to get headers with token
const getHeaders = () => {
  const token = localStorage.getItem('somasense_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleAuthError = (res: Response) => {
  if (res.status === 401) {
    logoutUser();
    window.location.reload();
  }
};

export const loginUser = async (email: string, password: string): Promise<void> => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Login error');
  }

  const data = await res.json();
  localStorage.setItem('somasense_token', data.access_token);
};

export const registerUser = async (email: string, password: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Registration error');
  }

  const data = await res.json();
  localStorage.setItem('somasense_token', data.access_token);
};

export const logoutUser = async (): Promise<void> => {
  const token = localStorage.getItem('somasense_token');
  localStorage.removeItem('somasense_token');
  if (!token) return;

  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch {
    // Local removal still prevents reuse if the server cannot be reached.
  }
};

export const fetchPantryItems = async (limit = 100, offset = 0): Promise<PantryItem[]> => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/items?${params}`, { headers: getHeaders() });
  handleAuthError(res);
  if (!res.ok) throw new Error('Data fetch error');
  return res.json();
};

export const addPantryItem = async (item: Omit<PantryItem, 'id'>): Promise<PantryItem> => {
  const res = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(item),
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error recording resource');
  return res.json();
};

export const deletePantryItem = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE}/items/${id}`, { 
    method: 'DELETE',
    headers: getHeaders() 
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error removing item');
};

export const getDietPlan = async (): Promise<string> => {
  const res = await fetch(`${API_BASE}/ai/diet`, { 
    method: 'POST',
    headers: getHeaders()
  });
  handleAuthError(res);
  if (!res.ok) {
     const errorData = await res.json().catch(() => ({}));
     throw new Error(errorData.detail || 'Error generating protocol.');
  }
  const data = await res.json();
  return data.plan;
};

export const getWorkoutPlan = async (payload: {
  goal?: string;
  age?: number;
  weight?: number;
  activityLevel?: string;
  injuries?: string;
  discipline?: string;
  equipment?: string;
  focus_areas?: string;
}): Promise<string> => {
  const res = await fetch(`${API_BASE}/ai/workout`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error generating program.');
  const data = await res.json();
  return data.plan;
};

export const getShoppingList = async (
  workoutPlan?: string, 
  days: number = 7, 
  budget?: number, 
  avoids?: string, 
  preferences?: string
): Promise<string> => {
  const res = await fetch(`${API_BASE}/ai/shopping`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ 
      workout_plan: workoutPlan,
      days,
      budget,
      avoids,
      preferences
    }),
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error synchronizing supplies.');
  const data = await res.json();
  return data.plan;
};

export const fetchActivities = async (limit = 100, offset = 0): Promise<Activity[]> => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/activities?${params}`, { headers: getHeaders() });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error fetching records');
  return res.json();
};

export const addActivity = async (item: Omit<Activity, 'id'>): Promise<Activity> => {
  const res = await fetch(`${API_BASE}/activities`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(item),
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error recording activity');
  return res.json();
};

export const deleteActivity = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE}/activities/${id}`, { 
    method: 'DELETE',
    headers: getHeaders()
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error removing record');
};

export const getLastPlan = async (type: 'diet' | 'workout' | 'shopping'): Promise<{plan: string | null; created_at?: string}> => {
  const res = await fetch(`${API_BASE}/ai/last_plan/${type}`, { headers: getHeaders() });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error fetching plan history');
  return res.json();
};

export const getProfile = async (): Promise<UserProfile> => {
  const res = await fetch(`${API_BASE}/profile`, { headers: getHeaders() });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error fetching profile');
  return res.json();
};

export const updateProfile = async (profile: UserProfile): Promise<UserProfile> => {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profile)
  });
  handleAuthError(res);
  if (!res.ok) throw new Error('Error updating biometrics');
  return res.json();
};
