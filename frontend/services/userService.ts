export interface UserProfilePayload {
  id: string;
  name: string;
  email: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
  value?: string;
}

const PROFILE_CACHE_KEY = 'mythical-profile';
const API_KEYS_CACHE_KEY = 'mythical-api-keys';

const safeFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || response.statusText);
  }

  return response.json();
};

const getStoredProfile = (): UserProfilePayload => {
  const stored = localStorage.getItem(PROFILE_CACHE_KEY);
  if (!stored) {
    return {
      id: 'demo-user',
      name: 'Admin User',
      email: 'admin@mythical.ai',
    };
  }

  return JSON.parse(stored) as UserProfilePayload;
};

const getStoredApiKeys = (): ApiKeyItem[] => {
  const stored = localStorage.getItem(API_KEYS_CACHE_KEY);
  if (!stored) return [];
  return JSON.parse(stored) as ApiKeyItem[];
};

const persistProfile = (profile: UserProfilePayload) => {
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
};

const persistApiKeys = (keys: ApiKeyItem[]) => {
  localStorage.setItem(API_KEYS_CACHE_KEY, JSON.stringify(keys));
};

export const fetchUserProfile = async (): Promise<UserProfilePayload> => {
  try {
    const profile = await safeFetch<UserProfilePayload>('/api/user/profile');
    persistProfile(profile);
    return profile;
  } catch {
    return getStoredProfile();
  }
};

export const updateUserProfile = async (profile: Omit<UserProfilePayload, 'id'>): Promise<UserProfilePayload> => {
  try {
    const updatedProfile = await safeFetch<UserProfilePayload>('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    persistProfile(updatedProfile);
    return updatedProfile;
  } catch {
    const current = getStoredProfile();
    const fallbackProfile: UserProfilePayload = {
      id: current.id || 'demo-user',
      name: profile.name,
      email: profile.email,
    };
    persistProfile(fallbackProfile);
    return fallbackProfile;
  }
};

export const fetchApiKeys = async (): Promise<ApiKeyItem[]> => {
  try {
    const apiKeys = await safeFetch<ApiKeyItem[]>('/api/user/api-keys');
    persistApiKeys(apiKeys);
    return apiKeys;
  } catch {
    return getStoredApiKeys();
  }
};

export const createApiKey = async (): Promise<ApiKeyItem> => {
  try {
    const apiKey = await safeFetch<ApiKeyItem>('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const currentKeys = getStoredApiKeys();
    persistApiKeys([apiKey, ...currentKeys]);
    return apiKey;
  } catch {
    const randomKey = [...Array(48)].map(() => Math.random().toString(36).slice(2)).join('').slice(0, 48);
    const newKey: ApiKeyItem = {
      id: `local-${Date.now()}`,
      name: `Local API Key ${new Date().toISOString().slice(0, 10)}`,
      maskedKey: `${randomKey.slice(0, 4)}…${randomKey.slice(-4)}`,
      value: randomKey,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    const currentKeys = getStoredApiKeys();
    persistApiKeys([newKey, ...currentKeys]);
    return newKey;
  }
};

export const revokeApiKey = async (id: string): Promise<void> => {
  try {
    await safeFetch<void>(`/api/user/api-keys/${id}`, {
      method: 'DELETE',
    });
  } catch {
    // ignore network error, still remove locally
  }

  const apiKeys = getStoredApiKeys().filter((item) => item.id !== id);
  persistApiKeys(apiKeys);
};

export const deleteAccount = async (): Promise<void> => {
  try {
    await safeFetch<void>('/api/user/account', { method: 'DELETE' });
  } catch {
    // ignore network error
  }

  localStorage.removeItem(PROFILE_CACHE_KEY);
  localStorage.removeItem(API_KEYS_CACHE_KEY);
};
