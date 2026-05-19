import json
import sys
from pathlib import Path

import joblib
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best_xgb_model.joblib"
LABEL_ENCODER_PATH = BASE_DIR / "label_encoder.joblib"

REQUIRED_FEATURES = [
    "pH",
    "Nitrogen",
    "Phosphorus",
    "Potassium",
    "Organic_Carbon",
    "Soil_Texture",
    "Rainfall_mm",
    "Temperature_C",
    "Market_Price_KES",
    "Farm_Size_ha",
    "Irrigation",
    "Input_Budget_KES",
    "Farmer_Profile",
    "Sub_County",
    "Season",
    "Humidity_pct",
    "market_signal",
]

DEFAULTS = {
    "pH": 6.3,
    "Nitrogen": 0.16,
    "Phosphorus": 16.0,
    "Potassium": 140.0,
    "Organic_Carbon": 2.0,
    "Soil_Texture": "Loamy",
    "Rainfall_mm": 540.0,
    "Temperature_C": 24.5,
    "Market_Price_KES": 6500.0,
    "Farm_Size_ha": 1.0,
    "Irrigation": 0,
    "Input_Budget_KES": 10000.0,
    "Farmer_Profile": "Mixed",
    "Sub_County": "Bondo",
    "Season": "long_rains",
    "Humidity_pct": 72.0,
    "market_signal": "fair",
}


def load_artifacts():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing model file: {MODEL_PATH}")
    if not LABEL_ENCODER_PATH.exists():
        raise FileNotFoundError(f"Missing label encoder file: {LABEL_ENCODER_PATH}")
    model = joblib.load(MODEL_PATH)
    label_encoder = joblib.load(LABEL_ENCODER_PATH)
    return model, label_encoder


def normalize_payload(payload: dict) -> dict:
    normalized = DEFAULTS.copy()
    normalized.update(payload or {})
    return {key: normalized.get(key, DEFAULTS[key]) for key in REQUIRED_FEATURES}


def predict_top3(payload: dict):
    model, label_encoder = load_artifacts()
    row = normalize_payload(payload)
    df_input = pd.DataFrame([row], columns=REQUIRED_FEATURES)

    if not hasattr(model, "predict_proba"):
        predicted_label_encoded = model.predict(df_input)
        predicted_crop = label_encoder.inverse_transform(predicted_label_encoded)[0]
        return [{"crop": predicted_crop, "suitability": 100.0}]

    probs = model.predict_proba(df_input)[0]
    top_indices = probs.argsort()[::-1][:3]
    top_scores = probs[top_indices] * 100
    top_crops = label_encoder.inverse_transform(top_indices)

    return [
        {"crop": top_crops[i], "suitability": round(float(top_scores[i]), 1)}
        for i in range(len(top_indices))
    ]


def main():
    try:
        if len(sys.argv) > 1 and sys.argv[1] == "--json":
            if len(sys.argv) > 2 and sys.argv[2]:
                payload = json.loads(sys.argv[2])
            else:
                payload = json.loads(sys.stdin.read() or "{}")
            print(json.dumps({"recommendations": predict_top3(payload)}))
            return

        sample_payload = DEFAULTS.copy()
        recommendations = predict_top3(sample_payload)
        print(json.dumps({"recommendations": recommendations}, indent=2))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
