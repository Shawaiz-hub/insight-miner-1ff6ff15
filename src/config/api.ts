// API Configuration for SmartMine
// This file centralizes API endpoint configuration for different environments

/**
 * Get the base URL for the backend API
 * - In development: Uses localhost:5000
 * - In production: Uses the environment variable or falls back to configured URL
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://your-username.pythonanywhere.com'  // Update this with your PythonAnywhere URL
    : 'http://localhost:5000');

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Health & Status
  health: `${API_BASE}/api/health`,
  
  // Dataset Management
  upload: `${API_BASE}/api/upload`,
  preprocess: `${API_BASE}/api/preprocess`,
  datasetInfo: `${API_BASE}/api/dataset/info`,
  datasetPreview: `${API_BASE}/api/dataset/preview`,
  
  // Algorithm Recommendation
  recommend: `${API_BASE}/api/recommend`,
  algorithms: `${API_BASE}/api/algorithms`,
  
  // Mining Operations
  mine: `${API_BASE}/api/mine`,
  classify: `${API_BASE}/api/classify`,
  cluster: `${API_BASE}/api/cluster`,
  elbow: `${API_BASE}/api/elbow`,
  
  // Prediction
  predict: `${API_BASE}/api/predict`,
} as const;

/**
 * Helper function to make API calls with error handling
 */
export async function apiCall<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.status}`);
  }

  return response.json();
}
