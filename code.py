import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

warnings.filterwarnings('ignore')

ROOT_DIR = Path(__file__).resolve().parent
TRAINING_DIR = ROOT_DIR / 'backend' / 'training'
DATA_PROCESSED_DIR = TRAINING_DIR / 'data' / 'processed'
MODELS_DIR = TRAINING_DIR / 'models'

REAL_DATASET_PATH = DATA_PROCESSED_DIR / 'training_dataset_real.csv'
SOIL_REFERENCE_PATH = DATA_PROCESSED_DIR / 'siaya_location_soil_reference.csv'

MODELS_DIR.mkdir(parents=True, exist_ok=True)
DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def _bucket_temperature(value: float) -> str:
    if pd.isna(value):
        return 'unknown'
    if value < 20:
        return 'cool'
    if value < 26:
        return 'moderate'
    return 'hot'


def _bucket_rain(value: float) -> str:
    if pd.isna(value):
        return 'unknown'
    if value < 1:
        return 'none'
    if value < 5:
        return 'light'
    if value < 15:
        return 'moderate'
    return 'heavy'


def _bucket_humidity(value: float) -> str:
    if pd.isna(value):
        return 'unknown'
    if value < 45:
        return 'dry'
    if value < 70:
        return 'normal'
    return 'humid'


def _normalize_soil_texture(value: str) -> str:
    text = str(value or '').strip().lower()
    if 'sand' in text:
        return 'Sandy'
    if 'clay' in text:
        return 'Clayey'
    if 'loam' in text:
        return 'Loamy'
    return 'Loamy'


def _soil_type_for_backend(value: str) -> str:
    mapped = _normalize_soil_texture(value)
    if mapped == 'Sandy':
        return 'sandy loam'
    if mapped == 'Clayey':
        return 'clay loam'
    return 'loam'


def _derive_farmer_profile(farm_size: float, budget: float, irrigation: int) -> str:
    if farm_size >= 3.0 and budget >= 18000:
        return 'Commercial'
    if farm_size < 1.2 and budget < 9000 and irrigation == 0:
        return 'Subsistence'
    if irrigation == 1 and budget >= 12000:
        return 'Progressive'
    return 'Mixed'


def load_real_data() -> pd.DataFrame:
    if not REAL_DATASET_PATH.exists():
        raise FileNotFoundError(f'Real dataset not found: {REAL_DATASET_PATH}')

    df = pd.read_csv(REAL_DATASET_PATH)

    expected = {
        'soil_ph_avg': 'pH',
        'organic_matter_avg': 'Organic_Carbon',
        'precipitation_sum': 'Rainfall_daily_mm',
        'temperature_2m_mean': 'Temperature_C',
        'market_retail_avg': 'Market_Price_per_kg',
        'relative_humidity_2m_mean': 'Humidity_pct',
        'soil_type': 'Soil_Texture',
        'sub_county': 'Sub_County',
        'season': 'Season',
        'market_signal': 'market_signal',
        'target_crop': 'target_crop'
    }
    df = df.rename(columns={k: v for k, v in expected.items() if k in df.columns})

    for col in ['pH', 'Organic_Carbon', 'Rainfall_daily_mm', 'Temperature_C', 'Market_Price_per_kg', 'Humidity_pct']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    if SOIL_REFERENCE_PATH.exists():
        soil_ref = pd.read_csv(SOIL_REFERENCE_PATH)
        keep_cols = ['sub_county', 'nitrogen', 'phosphorus', 'potassium']
        soil_ref = soil_ref[[c for c in keep_cols if c in soil_ref.columns]].copy()
        for c in ['nitrogen', 'phosphorus', 'potassium']:
            if c in soil_ref.columns:
                soil_ref[c] = pd.to_numeric(soil_ref[c], errors='coerce')

        soil_ref = soil_ref.groupby('sub_county', as_index=False).median(numeric_only=True)
        df = df.merge(soil_ref, left_on='Sub_County', right_on='sub_county', how='left')
    else:
        df['nitrogen'] = np.nan
        df['phosphorus'] = np.nan
        df['potassium'] = np.nan

    defaults = {
        'pH': 6.3,
        'Organic_Carbon': 1.8,
        'nitrogen': 0.14,
        'phosphorus': 15.0,
        'potassium': 140.0,
        'Rainfall_daily_mm': 6.0,
        'Temperature_C': 24.5,
        'Market_Price_per_kg': 67.5,
        'Humidity_pct': 72.0
    }

    for c, dv in defaults.items():
        if c not in df.columns:
            df[c] = dv
        df[c] = pd.to_numeric(df[c], errors='coerce')
        sub_median = df.groupby('Sub_County')[c].transform('median')
        df[c] = df[c].fillna(sub_median)
        df[c] = df[c].fillna(df[c].median())
        df[c] = df[c].fillna(dv)

    if 'Soil_Texture' not in df.columns:
        df['Soil_Texture'] = 'Loamy'
    df['Soil_Texture'] = df['Soil_Texture'].map(_normalize_soil_texture)

    if 'Sub_County' not in df.columns:
        df['Sub_County'] = 'Alego Usonga'
    df['Sub_County'] = df['Sub_County'].fillna('Alego Usonga').astype(str)

    if 'Season' not in df.columns:
        df['Season'] = 'long_rains'
    df['Season'] = df['Season'].fillna('long_rains').astype(str)

    if 'market_signal' not in df.columns:
        df['market_signal'] = 'fair'
    df['market_signal'] = df['market_signal'].fillna('fair').astype(str).str.lower()

    df['Rainfall_mm'] = df['Rainfall_daily_mm'] * 90.0
    df['Market_Price_KES'] = df['Market_Price_per_kg'] * 100.0

    rng = np.random.default_rng(42)
    farm_size = np.clip(rng.lognormal(mean=0.45, sigma=0.52, size=len(df)), 0.3, 8.0)
    irrigation = (df['Rainfall_daily_mm'] < 4.5).astype(int)
    input_budget = np.clip((farm_size * 4200) + (irrigation * 1800) + rng.normal(4200, 1200, len(df)), 4000, 30000)

    df['Farm_Size_ha'] = farm_size
    df['Irrigation'] = irrigation
    df['Input_Budget_KES'] = input_budget
    df['Farmer_Profile'] = [
        _derive_farmer_profile(fs, b, ir)
        for fs, b, ir in zip(df['Farm_Size_ha'], df['Input_Budget_KES'], df['Irrigation'])
    ]

    return df


def generate_dummy_profiles(real_df: pd.DataFrame, n: int = 500) -> pd.DataFrame:
    rng = np.random.default_rng(43)
    base = real_df.sample(n=n, replace=True, random_state=43).reset_index(drop=True).copy()

    dummy = pd.DataFrame({
        'pH': np.clip(base['pH'] + rng.normal(0, 0.35, n), 4.5, 7.8),
        'Nitrogen': np.clip(base['nitrogen'].fillna(0.14) + rng.normal(0, 0.03, n), 0.05, 0.30),
        'Phosphorus': np.clip(base['phosphorus'].fillna(15) + rng.normal(0, 3.8, n), 5, 35),
        'Potassium': np.clip(base['potassium'].fillna(140) + rng.normal(0, 18, n), 60, 320),
        'Organic_Carbon': np.clip(base['Organic_Carbon'] + rng.normal(0, 0.35, n), 0.5, 3.8),
        'Soil_Texture': rng.choice(['Sandy', 'Loamy', 'Clayey'], size=n, p=[0.3, 0.45, 0.25]),
        'Rainfall_mm': np.clip(base['Rainfall_mm'] + rng.normal(0, 140, n), 350, 1300),
        'Temperature_C': np.clip(base['Temperature_C'] + rng.normal(0, 1.8, n), 18, 33),
        'Market_Price_KES': np.clip(base['Market_Price_KES'] + rng.normal(0, 600, n), 2500, 9000),
        'Farm_Size_ha': np.clip(rng.lognormal(mean=0.45, sigma=0.55, size=n), 0.2, 8.0),
        'Irrigation': rng.choice([0, 1], size=n, p=[0.6, 0.4]),
        'Input_Budget_KES': np.clip(rng.normal(13000, 4500, n), 4000, 30000),
        'Sub_County': base['Sub_County'].values,
        'Season': base['Season'].values,
        'Humidity_pct': np.clip(base['Humidity_pct'] + rng.normal(0, 8, n), 40, 95),
        'market_signal': rng.choice(['good', 'fair', 'low'], size=n, p=[0.22, 0.58, 0.20]),
    })

    dummy['Farmer_Profile'] = [
        _derive_farmer_profile(fs, b, ir)
        for fs, b, ir in zip(dummy['Farm_Size_ha'], dummy['Input_Budget_KES'], dummy['Irrigation'])
    ]

    return dummy


def assign_crop(row: pd.Series) -> str:
    if row['Rainfall_mm'] > 840 and row['pH'] > 5.5 and row['Temperature_C'] < 28:
        return 'Rice'
    if row['Rainfall_mm'] > 720 and row['Organic_Carbon'] > 1.4 and row['Farmer_Profile'] in {'Commercial', 'Progressive'}:
        return 'Maize'
    if row['pH'] < 6.0 and row['Rainfall_mm'] < 620:
        return 'Sorghum'
    if row['Soil_Texture'] == 'Sandy' and row['Rainfall_mm'] < 700:
        return 'Millet'
    if row['Market_Price_KES'] > 5200 and row['Farm_Size_ha'] < 2.2 and row['Input_Budget_KES'] > 9000:
        return 'Beans'
    return 'Cassava'


def prepare_training_data(real_df: pd.DataFrame, dummy_df: pd.DataFrame) -> pd.DataFrame:
    core_real = pd.DataFrame({
        'pH': real_df['pH'],
        'Nitrogen': real_df['nitrogen'],
        'Phosphorus': real_df['phosphorus'],
        'Potassium': real_df['potassium'],
        'Organic_Carbon': real_df['Organic_Carbon'],
        'Soil_Texture': real_df['Soil_Texture'],
        'Rainfall_mm': real_df['Rainfall_mm'],
        'Temperature_C': real_df['Temperature_C'],
        'Market_Price_KES': real_df['Market_Price_KES'],
        'Farm_Size_ha': real_df['Farm_Size_ha'],
        'Irrigation': real_df['Irrigation'],
        'Input_Budget_KES': real_df['Input_Budget_KES'],
        'Farmer_Profile': real_df['Farmer_Profile'],
        'Sub_County': real_df['Sub_County'],
        'Season': real_df['Season'],
        'Humidity_pct': real_df['Humidity_pct'],
        'market_signal': real_df['market_signal'],
    })

    core_real['Recommended_Crop'] = real_df.get('target_crop', pd.Series(index=real_df.index)).fillna('')
    core_real['Recommended_Crop'] = core_real.apply(
        lambda row: row['Recommended_Crop'] if str(row['Recommended_Crop']).strip() else assign_crop(row),
        axis=1,
    )

    dummy_df = dummy_df.copy()
    dummy_df['Recommended_Crop'] = dummy_df.apply(assign_crop, axis=1)

    full = pd.concat([core_real, dummy_df], ignore_index=True)

    for col in ['pH', 'Nitrogen', 'Phosphorus', 'Potassium', 'Organic_Carbon', 'Rainfall_mm', 'Temperature_C', 'Market_Price_KES', 'Farm_Size_ha', 'Input_Budget_KES', 'Humidity_pct']:
        full[col] = pd.to_numeric(full[col], errors='coerce')
        full[col] = full[col].fillna(full[col].median())

    full['Irrigation'] = pd.to_numeric(full['Irrigation'], errors='coerce').fillna(0).astype(int)
    full['Soil_Texture'] = full['Soil_Texture'].map(_normalize_soil_texture)
    full['Farmer_Profile'] = full['Farmer_Profile'].fillna('Mixed').astype(str)
    full['Sub_County'] = full['Sub_County'].fillna('Alego Usonga').astype(str)
    full['Season'] = full['Season'].fillna('long_rains').astype(str)
    full['market_signal'] = full['market_signal'].fillna('fair').astype(str).str.lower()

    return full


def train_ensemble(df: pd.DataFrame):
    le_texture = LabelEncoder()
    df['Soil_Texture_Enc'] = le_texture.fit_transform(df['Soil_Texture'])

    le_profile = LabelEncoder()
    df['Farmer_Profile_Enc'] = le_profile.fit_transform(df['Farmer_Profile'])

    le_subcounty = LabelEncoder()
    df['Sub_County_Enc'] = le_subcounty.fit_transform(df['Sub_County'])

    le_season = LabelEncoder()
    df['Season_Enc'] = le_season.fit_transform(df['Season'])

    le_crop = LabelEncoder()
    df['Crop_Code'] = le_crop.fit_transform(df['Recommended_Crop'])

    feature_cols = [
        'pH', 'Nitrogen', 'Phosphorus', 'Potassium', 'Organic_Carbon',
        'Soil_Texture_Enc', 'Rainfall_mm', 'Temperature_C', 'Market_Price_KES',
        'Farm_Size_ha', 'Irrigation', 'Input_Budget_KES', 'Farmer_Profile_Enc',
        'Sub_County_Enc', 'Season_Enc', 'Humidity_pct'
    ]

    X = df[feature_cols]
    y = df['Crop_Code']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print('Training Fahamu Shamba Ensemble Model with REAL datasets...\n')

    rf_model = RandomForestClassifier(n_estimators=500, max_depth=20, random_state=42)
    rf_model.fit(X_train, y_train)

    xgb_model = XGBClassifier(
        n_estimators=600,
        learning_rate=0.1,
        max_depth=8,
        random_state=42,
        eval_metric='mlogloss',
        objective='multi:softprob',
    )
    xgb_model.fit(X_train, y_train)

    rf_probs = rf_model.predict_proba(X_test)
    xgb_probs = xgb_model.predict_proba(X_test)
    ensemble_probs = (0.3 * rf_probs) + (0.7 * xgb_probs)
    ensemble_pred = np.argmax(ensemble_probs, axis=1)

    accuracy = accuracy_score(y_test, ensemble_pred)
    print(f'Overall Accuracy: {accuracy * 100:.2f}%')
    print('\nClassification Report:')
    print(classification_report(y_test, ensemble_pred, target_names=le_crop.classes_, zero_division=0))

    # Save full Python artifacts
    joblib.dump(rf_model, MODELS_DIR / 'rf_model.joblib')
    joblib.dump(xgb_model, MODELS_DIR / 'xgb_model.joblib')
    joblib.dump(le_texture, MODELS_DIR / 'le_texture.joblib')
    joblib.dump(le_profile, MODELS_DIR / 'le_profile.joblib')
    joblib.dump(le_subcounty, MODELS_DIR / 'le_subcounty.joblib')
    joblib.dump(le_season, MODELS_DIR / 'le_season.joblib')
    joblib.dump(le_crop, MODELS_DIR / 'le_crop.joblib')

    print('\nModels saved successfully.')

    return {
        'df': df,
        'X': X,
        'rf_model': rf_model,
        'xgb_model': xgb_model,
        'le_crop': le_crop,
        'accuracy': accuracy,
    }


def export_backend_model(model_bundle: dict):
    df = model_bundle['df'].copy()
    X = model_bundle['X']
    rf_model = model_bundle['rf_model']
    xgb_model = model_bundle['xgb_model']
    le_crop = model_bundle['le_crop']

    rf_probs = rf_model.predict_proba(X)
    xgb_probs = xgb_model.predict_proba(X)
    final_probs = (0.3 * rf_probs) + (0.7 * xgb_probs)

    model_features = [
        'sub_county',
        'season',
        'soil_type',
        'temperature_bucket',
        'rain_bucket',
        'humidity_bucket',
        'market_signal',
        'farmer_profile',
    ]

    distilled = {
        'trained_at': pd.Timestamp.utcnow().isoformat(),
        'algorithm': 'rf_xgb_ensemble_distilled_for_node',
        'features': model_features,
        'classes': list(le_crop.classes_),
        'priors': {},
        'class_counts': {},
        'feature_counts': {c: {f: {} for f in model_features} for c in le_crop.classes_},
        'feature_values': {f: [] for f in model_features},
        'metrics': {
            'train_samples': int(len(df)),
            'accuracy': float(model_bundle['accuracy']),
        },
    }

    df['sub_county'] = df['Sub_County'].astype(str)
    df['season'] = df['Season'].astype(str)
    df['soil_type'] = df['Soil_Texture'].apply(_soil_type_for_backend)
    df['temperature_bucket'] = df['Temperature_C'].apply(_bucket_temperature)
    df['rain_bucket'] = (df['Rainfall_mm'] / 90.0).apply(_bucket_rain)
    df['humidity_bucket'] = df['Humidity_pct'].apply(_bucket_humidity)
    df['market_signal'] = df['market_signal'].astype(str).str.lower()
    df['farmer_profile'] = df['Farmer_Profile'].astype(str)

    class_names = list(le_crop.classes_)

    for row_idx in range(len(df)):
        row = df.iloc[row_idx]
        probs = final_probs[row_idx]

        for class_idx, crop_name in enumerate(class_names):
            w = float(probs[class_idx])
            distilled['class_counts'][crop_name] = distilled['class_counts'].get(crop_name, 0.0) + w

            for feature in model_features:
                fv = str(row[feature]) if pd.notna(row[feature]) and str(row[feature]).strip() else 'unknown'
                current = distilled['feature_counts'][crop_name][feature].get(fv, 0.0)
                distilled['feature_counts'][crop_name][feature][fv] = current + w
                if fv not in distilled['feature_values'][feature]:
                    distilled['feature_values'][feature].append(fv)

    total = sum(distilled['class_counts'].values()) or 1.0
    for cls, c in distilled['class_counts'].items():
        distilled['priors'][cls] = float(c / total)

    out_file = MODELS_DIR / 'crop_naive_bayes_model.json'
    with out_file.open('w', encoding='utf-8') as f:
        json.dump(distilled, f, indent=2)

    print(f'Exported backend model: {out_file}')


def save_training_datasets(real_df: pd.DataFrame, dummy_df: pd.DataFrame, full_df: pd.DataFrame):
    (DATA_PROCESSED_DIR / 'farmer_profiles_dummy.csv').write_text(dummy_df.to_csv(index=False), encoding='utf-8')
    (DATA_PROCESSED_DIR / 'ensemble_training_dataset.csv').write_text(full_df.to_csv(index=False), encoding='utf-8')

    summary = {
        'generated_at': pd.Timestamp.utcnow().isoformat(),
        'real_rows': int(len(real_df)),
        'dummy_farmer_rows': int(len(dummy_df)),
        'total_training_rows': int(len(full_df)),
        'class_distribution': full_df['Recommended_Crop'].value_counts().to_dict(),
    }
    with (DATA_PROCESSED_DIR / 'ensemble_training_summary.json').open('w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)

    print(f"Saved dummy farmers: {DATA_PROCESSED_DIR / 'farmer_profiles_dummy.csv'}")
    print(f"Saved combined training data: {DATA_PROCESSED_DIR / 'ensemble_training_dataset.csv'}")


def predict_crop(farmer_data: dict):
    rf_model = joblib.load(MODELS_DIR / 'rf_model.joblib')
    xgb_model = joblib.load(MODELS_DIR / 'xgb_model.joblib')
    le_texture = joblib.load(MODELS_DIR / 'le_texture.joblib')
    le_profile = joblib.load(MODELS_DIR / 'le_profile.joblib')
    le_subcounty = joblib.load(MODELS_DIR / 'le_subcounty.joblib')
    le_season = joblib.load(MODELS_DIR / 'le_season.joblib')
    le_crop = joblib.load(MODELS_DIR / 'le_crop.joblib')

    df_input = pd.DataFrame([farmer_data])
    df_input['Soil_Texture_Enc'] = le_texture.transform(df_input['Soil_Texture'])
    df_input['Farmer_Profile_Enc'] = le_profile.transform(df_input['Farmer_Profile'])
    df_input['Sub_County_Enc'] = le_subcounty.transform(df_input['Sub_County'])
    df_input['Season_Enc'] = le_season.transform(df_input['Season'])

    feature_cols = [
        'pH', 'Nitrogen', 'Phosphorus', 'Potassium', 'Organic_Carbon',
        'Soil_Texture_Enc', 'Rainfall_mm', 'Temperature_C', 'Market_Price_KES',
        'Farm_Size_ha', 'Irrigation', 'Input_Budget_KES', 'Farmer_Profile_Enc',
        'Sub_County_Enc', 'Season_Enc', 'Humidity_pct'
    ]

    rf_prob = rf_model.predict_proba(df_input[feature_cols])
    xgb_prob = xgb_model.predict_proba(df_input[feature_cols])
    final_prob = (0.3 * rf_prob) + (0.7 * xgb_prob)

    top_indices = np.argsort(final_prob[0])[::-1][:3]
    top_crops = le_crop.inverse_transform(top_indices)
    top_scores = final_prob[0][top_indices] * 100

    return [
        {'crop': top_crops[0], 'suitability': round(float(top_scores[0]), 1)},
        {'crop': top_crops[1], 'suitability': round(float(top_scores[1]), 1)},
        {'crop': top_crops[2], 'suitability': round(float(top_scores[2]), 1)},
    ]


def main():
    print('Loading real datasets...')
    real_df = load_real_data()

    print('Generating 500 dummy farmer profiles...')
    dummy_df = generate_dummy_profiles(real_df, n=500)

    print('Preparing combined training dataset...')
    full_df = prepare_training_data(real_df, dummy_df)
    save_training_datasets(real_df, dummy_df, full_df)

    model_bundle = train_ensemble(full_df)
    export_backend_model(model_bundle)

    sample_farmer = {
        'pH': 5.8,
        'Nitrogen': 0.15,
        'Phosphorus': 18,
        'Potassium': 180,
        'Organic_Carbon': 2.1,
        'Soil_Texture': 'Loamy',
        'Rainfall_mm': 850,
        'Temperature_C': 24,
        'Market_Price_KES': 4500,
        'Farm_Size_ha': 1.8,
        'Irrigation': 1,
        'Input_Budget_KES': 12000,
        'Farmer_Profile': 'Progressive',
        'Sub_County': 'Bondo',
        'Season': 'long_rains',
        'Humidity_pct': 72,
    }

    result = predict_crop(sample_farmer)
    print('\nFahamu Shamba Recommendation for Sample Farmer:')
    for rec in result:
        print(f"-> {rec['crop']} ({rec['suitability']}%)")


if __name__ == '__main__':
    main()
