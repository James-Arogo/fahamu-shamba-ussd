                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         # Real Data Training Pipeline

This folder contains the real-data training workflow for Fahamu Shamba.

## Data sources

- Weather/climate: Open-Meteo Historical Weather API
  - Docs: https://open-meteo.com/en/docs/historical-weather-api
  - Variables used: rainfall (`precipitation_sum`), temperature (`temperature_2m_mean`), humidity (`relative_humidity_2m_mean`), plus soil moisture and soil temperature when available.
- Soil/geolocation: Siaya ward and sub-county centroids from the app boundary map, joined with KALRO soil measurements.
  - KALRO reference: https://www.kalro.org/land-soil-crop-suitability-hub/
- Market data: live Siaya market snapshot from the existing backend market source, or an external CSV override.

## Important note about GPS and soil data

GPS does not directly measure soil chemistry. In this pipeline:

- GPS/centroids identify the ward or sub-county.
- Soil values such as pH, organic matter, nitrogen, phosphorus, and potassium must come from KALRO data or field sensors.
- The pipeline creates a location-to-soil reference file so every ward in Siaya can be linked to the best available soil record.

## Files to provide

Place optional external files in `backend/training/data/external/`:

- `kalro_siaya_soil.csv`
- `siaya_market_prices.csv`

### Required soil CSV columns

```csv
sub_county,ward,soil_type,soil_ph,organic_matter,nitrogen,phosphorus,potassium,target_crop,yield_kg_per_ha,source_date
```

### Optional market CSV columns

```csv
crop,market,county,sub_county,retail_price,wholesale_price,signal,average_retail,observed_at,source
```

If `siaya_market_prices.csv` is missing, the system falls back to the live market source already used by the backend.

## Run

From the backend folder:

```bash
npm run training:download
```

You can also control the date range and weather location scope:

```bash
TRAINING_START_DATE=2000-01-01 \
TRAINING_END_DATE=2026-04-03 \
TRAINING_LOCATION_SCOPE=wards \
npm run training:download
```

Use `TRAINING_LOCATION_SCOPE=subcounties` if you want a smaller, faster dataset.
That is also the default, because Open-Meteo can rate-limit large ward-by-ward downloads.

You can tune request pacing if needed:

```bash
OPEN_METEO_DELAY_MS=30000 \
OPEN_METEO_RATE_LIMIT_BACKOFF_MS=65000 \
npm run training:download
```

## Outputs

The pipeline writes:

- `backend/training/data/raw/siaya_wards_centroids.csv`
- `backend/training/data/raw/siaya_subcounties_centroids.csv`
- `backend/training/data/raw/weather_open_meteo_daily.csv`
- `backend/training/data/raw/kalro_siaya_soil_normalized.csv`
- `backend/training/data/raw/market_siaya_snapshot.csv`
- `backend/training/data/processed/siaya_location_soil_reference.csv`
- `backend/training/data/processed/training_dataset_real.csv`
- `backend/training/data/processed/training_sources_manifest.json`
- `backend/training/models/crop_naive_bayes_model.json`

## Current baseline model

The current training step builds a simple categorical Naive Bayes baseline. It is intentionally lightweight so we can validate the real dataset flow before upgrading to stronger models such as XGBoost or LightGBM.
