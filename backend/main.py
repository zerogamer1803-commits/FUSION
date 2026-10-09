
from pathlib import Path
from datetime import datetime, timezone

import joblib
import pandas as pd
import shap

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# =========================================================
# 1. PROJECT PATHS AND FAULT MODEL
# =========================================================

PROJECT_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_DIR / "ml" / "fault_classifier.joblib"
HEALTH_MODEL_PATH = PROJECT_DIR / "ml" / "health_index_model.joblib"

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Fault model not found at: {MODEL_PATH}"
    )

saved_model = joblib.load(MODEL_PATH)

model = saved_model["model"]
FEATURES = list(saved_model["features"])
explainer = shap.TreeExplainer(model)

# Optional bundle for Health Index and Life Expectation.
# Expected keys:
# {
#     "features": [...],
#     "health_model": trained_health_model,
#     "life_model": trained_life_model
# }
health_saved_model = None

if HEALTH_MODEL_PATH.exists():
    health_saved_model = joblib.load(HEALTH_MODEL_PATH)


# =========================================================
# 2. FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="FUSION Smart Grid Monitoring API",
    description=(
        "Smart-grid fault classification, transformer "
        "health assessment, and life expectation API."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# =========================================================
# 3. FAULT DETECTION INPUT
# =========================================================

class SensorReadings(BaseModel):
    voltage: float = Field(ge=0, le=1000)
    current: float = Field(ge=0, le=10000)
    temperature: float = Field(ge=-50, le=200)
    frequency: float = Field(ge=0, le=1000)
    power_factor: float = Field(ge=-1, le=1)
    vibration_level: float = Field(ge=0, le=10000)
    device_age_years: int = Field(ge=0, le=200)
    terminal_efficiency: float = Field(ge=0, le=100)
    load_variation: float = Field(ge=-100, le=1000)
    signal_strength: float = Field(ge=-200, le=200)
    apparent_power: float = Field(ge=0, le=100000)
    real_power: float = Field(ge=0, le=100000)
    energy_consumed: float = Field(ge=0, le=1000000)


API_TO_MODEL = {
    "Voltage(V)": "voltage",
    "Current(A)": "current",
    "Temperature(C)": "temperature",
    "Frequency(Hz)": "frequency",
    "Power_Factor": "power_factor",
    "Vibration_Level": "vibration_level",
    "Device_Age(Years)": "device_age_years",
    "Terminal_Efficiency(%)": "terminal_efficiency",
    "Load_Variation(%)": "load_variation",
    "Signal_Strength(dB)": "signal_strength",
    "Apparent_Power(kVA)": "apparent_power",
    "Real_Power(kW)": "real_power",
    "Energy_Consumed(kWh)": "energy_consumed",
}


# =========================================================
# 4. HEALTH INDEX INPUT
# =========================================================

class HealthAssessmentInput(BaseModel):
    Hydrogen: float = Field(ge=0)
    Oxygen: float = Field(ge=0)
    Nitrogen: float = Field(ge=0)
    Methane: float = Field(ge=0)
    CO: float = Field(ge=0)
    CO2: float = Field(ge=0)
    Ethylene: float = Field(ge=0)
    Ethane: float = Field(ge=0)
    Acetylene: float = Field(ge=0)
    DBDS: float = Field(ge=0)
    power_factor: float = Field(ge=0, le=1)
    interfacial_v: float = Field(ge=0)
    dielectric_rigidity: float = Field(ge=0)
    water_content: float = Field(ge=0)


HEALTH_API_TO_MODEL = {
    "Hydrogen": "Hydrogen",
    "Oxygen": "Oxygen",
    "Nitrogen": "Nitrogen",
    "Methane": "Methane",
    "CO": "CO",
    "CO2": "CO2",
    "Ethylene": "Ethylene",
    "Ethane": "Ethane",
    "Acetylene": "Acetylene",
    "DBDS": "DBDS",
    "Power factor": "power_factor",
    "Interfacial V": "interfacial_v",
    "Dielectric rigidity": "dielectric_rigidity",
    "Water content": "water_content",
}


# =========================================================
# 5. LATEST RESULTS
# =========================================================

latest_result = None
latest_health_result = None


# =========================================================
# 6. BASIC ENDPOINTS
# =========================================================

@app.get("/")
def home():
    return {
        "project": "FUSION Smart Grid Monitoring",
        "status": "running",
        "fault_model_loaded": True,
        "health_model_loaded": health_saved_model is not None,
        "message": "Backend is ready.",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "fault_model_loaded": True,
        "health_model_loaded": health_saved_model is not None,
    }


@app.get("/latest")
def get_latest():
    if latest_result is None:
        return {
            "available": False,
            "message": "No fault prediction submitted yet.",
        }

    return {
        "available": True,
        **latest_result,
    }


@app.get("/health-assessment/latest")
def get_latest_health_assessment():
    if latest_health_result is None:
        return {
            "available": False,
            "message": "No health assessment submitted yet.",
        }

    return {
        "available": True,
        **latest_health_result,
    }


# =========================================================
# 7. FAULT DETECTION
# =========================================================

@app.post("/predict")
def predict(readings: SensorReadings):
    global latest_result

    input_values = readings.model_dump()

    missing_features = [
        column for column in FEATURES
        if column not in API_TO_MODEL
    ]

    if missing_features:
        raise HTTPException(
            status_code=500,
            detail=(
                "Fault model contains unsupported features: "
                + ", ".join(missing_features)
            ),
        )

    row = {
        column: input_values[API_TO_MODEL[column]]
        for column in FEATURES
    }

    input_df = pd.DataFrame([row], columns=FEATURES)

    predicted_status = int(model.predict(input_df)[0])

    if not hasattr(model, "predict_proba"):
        raise HTTPException(
            status_code=500,
            detail="The loaded fault model does not support probabilities.",
        )

    probabilities = model.predict_proba(input_df)[0]
    class_positions = {
        int(label): index
        for index, label in enumerate(model.classes_)
    }

    fault_probability = float(
        probabilities[class_positions[1]]
    ) if 1 in class_positions else 0.0

    shap_values = explainer.shap_values(input_df)

    if isinstance(shap_values, list):
        fault_shap = (
            shap_values[1][0]
            if len(shap_values) > 1
            else shap_values[0][0]
        )
    elif getattr(shap_values, "ndim", 0) == 3:
        fault_class_index = class_positions.get(1, 0)
        fault_shap = shap_values[0, :, fault_class_index]
    else:
        fault_shap = shap_values[0]

    contributions = [
        {
            "feature": feature,
            "sensor_value": float(input_df.iloc[0][feature]),
            "contribution": float(value),
        }
        for feature, value in zip(FEATURES, fault_shap)
    ]

    contributions.sort(
        key=lambda item: abs(item["contribution"]),
        reverse=True,
    )

    prediction = {
        "predicted_status": predicted_status,
        "status_label": (
            "FAULT" if predicted_status == 1 else "NORMAL"
        ),
        "fault_probability": round(fault_probability, 4),
        "model_type": "Random Forest",
        "prediction_type": "dataset_based_fault_classification",
        "top_influencing_features": contributions[:5],
        "warning": (
            "Dataset-based classification, not a validated "
            "prediction of future equipment failure."
        ),
    }

    latest_result = {
        "readings": input_values,
        "prediction": prediction,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    return prediction


# =========================================================
# 8. HEALTH INDEX AND LIFE EXPECTATION
# =========================================================

@app.post("/health-assessment")
def assess_health(readings: HealthAssessmentInput):
    global latest_health_result

    if health_saved_model is None:
        return {
            "available": False,
            "health_index": None,
            "life_expectation": None,
            "message": (
                "Health assessment model is not installed. "
                "Train and save ml/health_index_model.joblib "
                "with features, health_model, and life_model "
                "before requesting predictions."
            ),
        }

    try:
        health_features = list(health_saved_model["features"])
        health_model = health_saved_model["health_model"]
        life_model = health_saved_model["life_model"]

        input_values = readings.model_dump()

        missing_features = [
            name for name in health_features
            if name not in HEALTH_API_TO_MODEL
        ]

        if missing_features:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Unsupported health-model features: "
                    + ", ".join(missing_features)
                ),
            )

        row = {
            feature: input_values[HEALTH_API_TO_MODEL[feature]]
            for feature in health_features
        }

        input_df = pd.DataFrame(
            [row],
            columns=health_features,
        )

        health_index = float(
            health_model.predict(input_df)[0]
        )
        life_expectation = float(
            life_model.predict(input_df)[0]
        )

        result = {
            "available": True,
            "health_index": round(health_index, 3),
            "life_expectation": round(life_expectation, 3),
            "message": (
                "Predictions generated using the loaded "
                "health assessment models. Validate against "
                "the dataset units and model evaluation."
            ),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        latest_health_result = {
            "readings": input_values,
            **result,
        }

        return result

    except HTTPException:
        raise
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid health model bundle: {exc}",
        ) from exc
