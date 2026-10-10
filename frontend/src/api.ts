
const API_BASE_URL = "https://fusion-backend-0k7y.onrender.com";

export interface SensorReadings {
  voltage: number;
  current: number;
  temperature: number;
  frequency: number;
  power_factor: number;
  vibration_level: number;
  device_age_years: number;
  terminal_efficiency: number;
  load_variation: number;
  signal_strength: number;
  apparent_power: number;
  real_power: number;
  energy_consumed: number;
}

export interface InfluencingFeature {
  feature: string;
  sensor_value: number;
  contribution: number;
}

export interface FaultPrediction {
  predicted_status: number;
  status_label: "NORMAL" | "FAULT";
  fault_probability: number;
  model_type: string;
  prediction_type: string;
  top_influencing_features: InfluencingFeature[];
  warning: string;
}

export interface LatestData {
  available: boolean;
  readings?: SensorReadings;
  prediction?: FaultPrediction;
  updated_at?: string;
  message?: string;
}

export interface TransformerReadings {
  Hydrogen: number;
  Oxygen: number;
  Nitrogen: number;
  Methane: number;
  CO: number;
  CO2: number;
  Ethylene: number;
  Ethane: number;
  Acetylene: number;
  DBDS: number;
  power_factor: number;
  interfacial_v: number;
  dielectric_rigidity: number;
  water_content: number;
}

export interface HealthAssessment {
  available: boolean;
  health_index: number | null;
  life_expectation: number | null;
  message: string;
  updated_at?: string;
}

export async function checkBackend() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json();
}

export async function predictFault(
  sensorData: SensorReadings
): Promise<FaultPrediction> {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sensorData),
  });

  if (!response.ok) {
    throw new Error(`Prediction failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchLatest(): Promise<LatestData> {
  const response = await fetch(`${API_BASE_URL}/latest`);

  if (!response.ok) {
    throw new Error(`Fetching latest data failed: ${response.status}`);
  }

  return response.json();
}

export async function assessTransformer(
  readings: TransformerReadings
): Promise<HealthAssessment> {
  const response = await fetch(
    `${API_BASE_URL}/health-assessment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(readings),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Transformer assessment failed (${response.status}): ${detail}`
    );
  }

  return response.json();
}

export async function fetchLatestHealthAssessment(): Promise<HealthAssessment> {
  const response = await fetch(`${API_BASE_URL}/health-assessment/latest`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Health assessment fetch failed: ${response.status}`);
  }

  return response.json();
}
