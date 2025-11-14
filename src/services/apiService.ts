// API Service - Calls AWS Lambda via API Gateway
// This replaces direct database connections

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || '';

async function apiCall(path: string, options: RequestInit = {}) {
  const url = `${API_ENDPOINT}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }
  
  return response.json();
}

export async function initializeDatabase() {
  return apiCall('/init', { method: 'POST' });
}

export async function testConnection() {
  return apiCall('/test', { method: 'GET' });
}

export async function importSupplierHotel(data: {
  supplierCode: string;
  supplierHotelId: string;
  hotelName: string;
  addressLine1?: string;
  city?: string;
  countryCode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
}) {
  return apiCall('/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPendingReviews() {
  return apiCall('/reviews', { method: 'GET' });
}

export async function getPotentialMatches(supplierHotelId: number) {
  return apiCall(`/matches?id=${supplierHotelId}`, { method: 'GET' });
}

export async function manualMapHotel(supplierHotelId: number, masterHotelId: number) {
  return apiCall('/map', {
    method: 'POST',
    body: JSON.stringify({ supplierHotelId, masterHotelId }),
  });
}

export async function createMasterAndMap(
  supplierHotelId: number,
  masterData: {
    hotelName: string;
    addressLine1?: string;
    city?: string;
    countryCode?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    phoneNumber?: string;
  }
) {
  return apiCall('/create-master', {
    method: 'POST',
    body: JSON.stringify({ supplierHotelId, masterData }),
  });
}

export async function getMappingStats() {
  return apiCall('/stats', { method: 'GET' });
}

export async function getAllMasterHotels() {
  return apiCall('/masters', { method: 'GET' });
}
