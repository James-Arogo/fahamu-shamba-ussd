# Weather API Documentation - Siaya County

## Overview

The Fahamu Shamba Weather API provides comprehensive weather data for all 6 sub-counties of Siaya County in Kenya. The API supports hourly, daily, weekly, and monthly forecasts, along with agricultural metrics crucial for farming decisions.

**Base URL**: `http://localhost:5000/api/weather` (Development)

**Supported Sub-Counties**:
1. **Alego Usonga** (alego-usonga, alego, usonga)
2. **Bondo** (bondo)
3. **Gem** (gem)
4. **Rarieda** (rarieda)
5. **Ugenya** (ugenya)
6. **Ugunja** (ugunja)
7. **Siaya Town** (siaya) - Legacy support
8. **Yala** (yala) - Legacy support

---

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
   - [Live Weather Bundle](#1-live-weather-bundle)
   - [Current Weather](#2-current-weather)
   - [Hourly Forecast](#3-hourly-forecast)
   - [Daily Forecast](#4-daily-forecast)
   - [Monthly Outlook](#5-monthly-outlook)
   - [Agricultural Metrics](#6-agricultural-metrics)
   - [Farming Advisories](#7-farming-advisories)
   - [Historical Data](#8-historical-data-ml)
   - [All Sub-Counties](#9-all-sub-counties-summary)
   - [Compare Weather](#10-compare-weather)
   - [Best for Activity](#11-best-for-activity)
   - [Weather Alerts](#12-weather-alerts)
   - [Sub-Counties List](#13-sub-counties-list)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)
5. [Rate Limits](#rate-limits)
6. [Examples](#examples)

---

## Authentication

Currently, the Weather API does not require authentication for read operations. However, historical data storage requires a valid database connection.

---

## Endpoints

### 1. Live Weather Bundle

**GET** `/api/weather/live/:subcounty`

Get complete weather bundle for dashboard (current weather + forecasts + advisories).

**Parameters:**
- `subcounty` (path, required): Sub-county name (e.g., `bondo`, `gem`, `alego-usonga`)

**Response:**
```json
{
  "success": true,
  "location": "Bondo",
  "subcounty": "bondo",
  "current": {
    "temp": 26,
    "feels_like": 27,
    "temp_min": 19,
    "temp_max": 29,
    "humidity": 74,
    "pressure": 1013,
    "wind_speed": 7.2,
    "wind_deg": 45,
    "clouds": 75,
    "visibility": 10000,
    "description": "Partly cloudy",
    "icon": "02d",
    "weather_code": 802,
    "rain_1h": 0,
    "rain_3h": 0,
    "sunrise": 1709270400000,
    "sunset": 1709313600000,
    "agromet": {
      "evapotranspiration": 4.5,
      "soil_moisture": 0.35,
      "soil_temperature": 22
    }
  },
  "hourly": [
    {
      "dt": 1709280000000,
      "dt_txt": "2024-03-01 09:00:00",
      "temp": 26,
      "feels_like": 27,
      "humidity": 74,
      "pressure": 1013,
      "wind_speed": 7.2,
      "wind_deg": 45,
      "clouds": 75,
      "pop": 0.3,
      "rain": 0.5,
      "snow": 0,
      "description": "Partly cloudy",
      "icon": "02d",
      "weather_code": 802
    }
  ],
  "daily": [
    {
      "date": "2024-03-01",
      "temp_min": 19,
      "temp_max": 29,
      "temp_avg": 24,
      "humidity": 74,
      "wind_speed": 7.2,
      "pop": 30,
      "rain": 2.5,
      "description": "Partly cloudy",
      "icon": "02d"
    }
  ],
  "advisories": [
    {
      "type": "moderate_rain",
      "severity": "info",
      "icon": "🌦️",
      "message": "Moderate rain expected: Good for planting",
      "action": "Time fertilizer application carefully"
    }
  ],
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl http://localhost:5000/api/weather/live/bondo
```

---

### 2. Current Weather

**GET** `/api/weather/current/:subcounty`

Get current weather conditions only.

**Parameters:**
- `subcounty` (path, required): Sub-county name

**Response:**
```json
{
  "success": true,
  "data": {
    "location": "Bondo",
    "subcounty": "bondo",
    "temperature": 26,
    "feels_like": 27,
    "temp_min": 19,
    "temp_max": 29,
    "humidity": 74,
    "pressure": 1013,
    "wind_speed": 7.2,
    "wind_deg": 45,
    "clouds": 75,
    "visibility": 10000,
    "description": "Partly cloudy",
    "icon": "02d",
    "weather_code": 802,
    "rain_1h": 0,
    "rain_3h": 0,
    "sunrise": 1709270400000,
    "sunset": 1709313600000,
    "timestamp": 1709280000000,
    "source": "openweathermap"
  },
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl http://localhost:5000/api/weather/current/gem
```

---

### 3. Hourly Forecast

**GET** `/api/weather/hourly/:subcounty`

Get hourly forecast for next 48 hours.

**Parameters:**
- `subcounty` (path, required): Sub-county name
- `hours` (query, optional): Number of hours (default: 24, max: 48)

**Response:**
```json
{
  "success": true,
  "subcounty": "ugenya",
  "hours": 24,
  "data": [
    {
      "dt": 1709280000000,
      "dt_txt": "2024-03-01 09:00:00",
      "temp": 26,
      "feels_like": 27,
      "humidity": 74,
      "pressure": 1013,
      "wind_speed": 7.2,
      "wind_deg": 45,
      "clouds": 75,
      "pop": 0.3,
      "rain": 0.5,
      "snow": 0,
      "description": "Partly cloudy",
      "icon": "02d",
      "weather_code": 802
    }
  ],
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/weather/hourly/ugenya?hours=48"
```

---

### 4. Daily Forecast

**GET** `/api/weather/daily/:subcounty`

Get daily forecast for next 7-14 days.

**Parameters:**
- `subcounty` (path, required): Sub-county name
- `days` (query, optional): Number of days (default: 7, max: 14)

**Response:**
```json
{
  "success": true,
  "subcounty": "rarieda",
  "days": 7,
  "data": [
    {
      "date": "2024-03-01",
      "temp_min": 19,
      "temp_max": 29,
      "temp_avg": 24,
      "humidity": 74,
      "wind_speed": 7.2,
      "pop": 30,
      "rain": 2.5,
      "description": "Partly cloudy",
      "icon": "02d"
    }
  ],
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/weather/daily/rarieda?days=14"
```

---

### 5. Monthly Outlook

**GET** `/api/weather/monthly/:subcounty`

Get monthly outlook (30-day trend extrapolation).

**Parameters:**
- `subcounty` (path, required): Sub-county name

**Response:**
```json
{
  "success": true,
  "data": {
    "location": "Ugunja",
    "subcounty": "ugunja",
    "weeks": [
      {
        "week": 1,
        "start_date": "2024-03-01",
        "temp_avg": 24,
        "temp_min": 19,
        "temp_max": 29,
        "rain_probability": 35,
        "description": "Partly cloudy"
      }
    ],
    "summary": {
      "avg_temperature": 24,
      "avg_rain_probability": 35,
      "trend": "stable"
    },
    "timestamp": 1709280000000
  },
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl http://localhost:5000/api/weather/monthly/ugunja
```

---

### 6. Agricultural Metrics

**GET** `/api/weather/agricultural/:subcounty`

Get agricultural metrics (soil moisture, evapotranspiration, UV index).

**Parameters:**
- `subcounty` (path, required): Sub-county name

**Response:**
```json
{
  "success": true,
  "subcounty": "alego-usonga",
  "data": {
    "evapotranspiration": 4.5,
    "soil_moisture": 0.35,
    "soil_temperature": 22,
    "uv_index": null,
    "timestamp": 1709280000000,
    "source": "open-meteo"
  },
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl http://localhost:5000/api/weather/agricultural/alego-usonga
```

---

### 7. Farming Advisories

**GET** `/api/weather/advisory/:subcounty`

Get farming advisories based on weather conditions.

**Parameters:**
- `subcounty` (path, required): Sub-county name

**Response:**
```json
{
  "success": true,
  "subcounty": "bondo",
  "location": "Bondo",
  "advisories": [
    {
      "type": "moderate_rain",
      "severity": "info",
      "icon": "🌦️",
      "message": "Moderate rain expected: Good for planting",
      "action": "Time fertilizer application carefully"
    },
    {
      "type": "high_humidity",
      "severity": "info",
      "icon": "💧",
      "message": "High humidity: Monitor for fungal diseases",
      "action": "Inspect crops for signs of disease"
    }
  ],
  "count": 2,
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl http://localhost:5000/api/weather/advisory/bondo
```

---

### 8. Historical Data (ML)

**GET** `/api/weather/history/:subcounty`

Get historical weather data for ML model training.

**Parameters:**
- `subcounty` (path, required): Sub-county name
- `days` (query, optional): Number of days to retrieve (default: 30, max: 90)

**Response:**
```json
{
  "success": true,
  "data": {
    "subcounty": "gem",
    "period_days": 30,
    "current": [],
    "hourly": [],
    "daily": [],
    "agricultural": [],
    "total_records": 1234
  },
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/weather/history/gem?days=90"
```

---

### 9. All Sub-Counties Summary

**GET** `/api/weather/all-subcounties`

Get weather summary for all Siaya sub-counties.

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "subcounty": "bondo",
      "location": "Bondo",
      "temperature": 26,
      "description": "Partly cloudy",
      "humidity": 74,
      "wind_speed": 7.2,
      "rain_1h": 0,
      "icon": "02d"
    }
  ],
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl http://localhost:5000/api/weather/all-subcounties
```

---

### 10. Compare Weather

**GET** `/api/weather/compare`

Compare weather across multiple sub-counties.

**Parameters:**
- `subcounties` (query, required): Comma-separated list of sub-counties

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "subcounty": "bondo",
      "location": "Bondo",
      "temperature": 26,
      "feels_like": 27,
      "humidity": 74,
      "wind_speed": 7.2,
      "description": "Partly cloudy",
      "rain_1h": 0
    }
  ],
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/weather/compare?subcounties=bondo,gem,ugenya"
```

---

### 11. Best for Activity

**GET** `/api/weather/best-for-activity`

Get best sub-county for a specific farming activity.

**Parameters:**
- `activity` (query, optional): Activity type (`planting`, `harvesting`, `spraying`) (default: `planting`)

**Response:**
```json
{
  "success": true,
  "activity": "planting",
  "recommendation": {
    "subcounty": "gem",
    "location": "Gem",
    "score": 100,
    "temperature": 26,
    "rain_probability": 45,
    "wind_speed": 3.2,
    "description": "Partly cloudy"
  },
  "all_options": [],
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/weather/best-for-activity?activity=harvesting"
```

---

### 12. Weather Alerts

**GET** `/api/weather/alerts/:subcounty`

Get active weather alerts for a sub-county.

**Parameters:**
- `subcounty` (path, required): Sub-county name

**Response:**
```json
{
  "success": true,
  "subcounty": "rarieda",
  "location": "Rarieda",
  "alert_count": 1,
  "alerts": [
    {
      "type": "heavy_rain",
      "severity": "warning",
      "icon": "🌧️",
      "message": "Heavy rain expected: Ensure proper drainage",
      "action": "Avoid planting and fertilizer application today"
    }
  ],
  "all_advisories": [],
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl http://localhost:5000/api/weather/alerts/rarieda
```

---

### 13. Sub-Counties List

**GET** `/api/weather/subcounties`

Get list of supported sub-counties.

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "key": "alego-usonga",
      "name": "Alego Usonga",
      "lat": -0.1667,
      "lon": 34.3667,
      "alias": ["alego", "usonga"]
    }
  ],
  "timestamp": 1709280000000
}
```

**cURL Example:**
```bash
curl http://localhost:5000/api/weather/subcounties
```

---

## Data Models

### Weather Code Mapping

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Overcast |
| 45 | Fog |
| 51 | Light drizzle |
| 61 | Slight rain |
| 63 | Moderate rain |
| 65 | Heavy rain |
| 80 | Slight rain showers |
| 95 | Thunderstorm |

### Advisory Types

- `high_temperature` - Temperature > 35°C
- `low_temperature` - Temperature < 10°C
- `heavy_rain` - High precipitation expected
- `moderate_rain` - Moderate precipitation expected
- `dry_conditions` - Low rain probability
- `strong_wind` - Wind speed > 10 m/s
- `high_humidity` - Humidity > 85%

### Severity Levels

- `info` - Informational advisory
- `warning` - Important weather warning

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (invalid sub-county)
- `500` - Internal Server Error
- `503` - Service Unavailable (database connection)

---

## Rate Limits

Currently, no rate limits are enforced. However, best practices recommend:
- Cache weather data for at least 10 minutes
- Limit requests to 60 per hour per IP
- Use batch endpoints when possible

---

## Examples

### JavaScript (Fetch API)

```javascript
// Get live weather
async function getWeather(subcounty) {
  try {
    const response = await fetch(`/api/weather/live/${subcounty}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`Temperature in ${data.location}: ${data.current.temp}°C`);
      console.log(`Advisories:`, data.advisories);
    }
  } catch (error) {
    console.error('Weather fetch failed:', error);
  }
}

getWeather('bondo');
```

### Python (Requests)

```python
import requests

def get_weather(subcounty):
    url = f"http://localhost:5000/api/weather/live/{subcounty}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print(f"Temperature: {data['current']['temp']}°C")
            print(f"Description: {data['current']['description']}")
    else:
        print(f"Error: {response.status_code}")

get_weather('gem')
```

### Dashboard Integration

```javascript
// Load weather for farmer dashboard
async function loadWeatherDashboard(subcounty) {
  const response = await fetch(`/api/weather/live/${subcounty}`);
  const data = await response.json();
  
  // Update UI
  document.getElementById('temperature').textContent = `${data.current.temp}°C`;
  document.getElementById('description').textContent = data.current.description;
  
  // Show advisories
  data.advisories.forEach(advisory => {
    console.log(`${advisory.icon} ${advisory.message}`);
  });
}
```

---

## Notes

1. **Data Sources**: 
   - Primary: OpenWeatherMap API (when configured)
   - Fallback: Open-Meteo API (free tier)
   - Agricultural: Open-Meteo Agrometeo API

2. **Caching**: Weather data is automatically stored in the database for ML training purposes.

3. **ML Training**: Historical data accumulates over time and can be accessed via the `/api/weather/history` endpoint.

4. **Coordinates**: All sub-county coordinates are pre-configured for accuracy.

5. **Timezone**: All timestamps are in Africa/Nairobi timezone (EAT, UTC+3).

---

## Support

For issues or questions, please contact the development team or refer to the main project documentation.

**Last Updated**: March 11, 2026
**API Version**: 1.0.0
