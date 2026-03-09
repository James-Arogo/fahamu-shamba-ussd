/**
 * Google Weather-Style Dashboard Renderer
 * Displays hourly, daily forecasts and detail cards
 */

function setWeatherBackground(condition) {
    const bg = document.querySelector('.weather-dashboard');
    if (!bg) return;
    
    // Remove all background classes
    bg.classList.remove('sunny-bg', 'cloudy-bg', 'rainy-bg', 'stormy-bg', 'foggy-bg', 'default-bg');
    
    // Add appropriate background
    switch ((condition || '').toLowerCase()) {
        case 'rain':
        case 'drizzle':
        case 'thunderstorm':
            bg.classList.add('rainy-bg');
            break;
        case 'clouds':
        case 'overcast':
            bg.classList.add('cloudy-bg');
            break;
        case 'clear':
        case 'sunny':
            bg.classList.add('sunny-bg');
            break;
        case 'snow':
            bg.classList.add('snowy-bg');
            break;
        case 'mist':
        case 'fog':
            bg.classList.add('foggy-bg');
            break;
        default:
            bg.classList.add('default-bg');
    }
}

function renderHourlyStrip(hourly = []) {
    const strip = document.getElementById('hourlyStrip');
    if (!strip) return;
    
    if (!hourly || hourly.length === 0) {
        strip.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No hourly data</p>';
        return;
    }
    
    strip.innerHTML = hourly.slice(0, 12).map(hour => {
        const time = new Date(hour.dt_txt || hour.dt * 1000);
        const timeStr = time.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        const icon = getWeatherIcon(hour.weather?.[0]?.main || hour.description || '');
        const temp = Math.round(hour.temp || 0);
        const rain = Math.round((hour.pop || 0) * 100);
        
        return `
            <div class="hour-block">
                <div class="hour-time">${timeStr}</div>
                <div class="hour-icon">${icon}</div>
                <div class="hour-temp">${temp}°</div>
                <div class="hour-rain">${rain}%</div>
            </div>
        `;
    }).join('');
}

function renderDailyForecast(daily = []) {
    const forecast = document.getElementById('dailyForecast');
    if (!forecast) return;
    
    if (!daily || daily.length === 0) {
        forecast.innerHTML = '<p style="grid-column: 1/-1; padding: 20px; text-align: center; color: #999;">No daily data</p>';
        return;
    }
    
    forecast.innerHTML = daily.slice(0, 7).map(day => {
        const date = new Date(day.date || day.dt * 1000);
        const dayName = date.toLocaleDateString('en-KE', { weekday: 'short' });
        const icon = getWeatherIcon(day.weather?.[0]?.main || day.description || '');
        const high = Math.round(day.temp?.max || day.temperature?.max || 0);
        const low = Math.round(day.temp?.min || day.temperature?.min || 0);
        const rain = Math.round((day.pop || day.rain_probability || 0) * 100);
        
        return `
            <div class="day-block">
                <div class="day-name">${dayName}</div>
                <div class="day-icon">${icon}</div>
                <div class="day-temp">${high}° / ${low}°</div>
                <div class="day-rain">${rain}%</div>
            </div>
        `;
    }).join('');
}

function updateDetailsCards(current, daily = []) {
    const today = daily[0] || {};
    
    // Humidity
    const humidity = document.getElementById('detailHumidity');
    if (humidity) humidity.textContent = `${current.humidity || '--'}%`;
    
    // Wind
    const wind = document.getElementById('detailWind');
    if (wind) wind.textContent = `${Math.round(current.wind_speed || 0)} km/h`;
    
    // UV Index
    const uv = document.getElementById('detailUV');
    if (uv) uv.textContent = `${Math.round(current.uvi || 0)}`;
    
    // Rain Chance
    const rainChance = document.getElementById('detailRainChance');
    if (rainChance) rainChance.textContent = `${Math.round((today.pop || current.pop || 0) * 100)}%`;
    
    // Sunrise
    const sunrise = document.getElementById('detailSunrise');
    if (sunrise && (current.sunrise || today.sunrise)) {
        const sunriseTime = new Date((current.sunrise || today.sunrise) * 1000);
        sunrise.textContent = sunriseTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Sunset
    const sunset = document.getElementById('detailSunset');
    if (sunset && (current.sunset || today.sunset)) {
        const sunsetTime = new Date((current.sunset || today.sunset) * 1000);
        sunset.textContent = sunsetTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    }
}

function getWeatherIcon(condition) {
    if (!condition) return '🌡';
    
    const cond = (condition || '').toLowerCase();
    
    if (cond.includes('rain') || cond.includes('drizzle')) return '🌧';
    if (cond.includes('cloud') || cond.includes('overcast')) return '☁️';
    if (cond.includes('clear') || cond.includes('sunny')) return '☀️';
    if (cond.includes('snow')) return '❄️';
    if (cond.includes('thunder')) return '⛈️';
    if (cond.includes('wind')) return '💨';
    if (cond.includes('fog') || cond.includes('mist')) return '🌫️';
    
    return '🌡';
}

// Export functions for global use
window.setWeatherBackground = setWeatherBackground;
window.renderHourlyStrip = renderHourlyStrip;
window.renderDailyForecast = renderDailyForecast;
window.updateDetailsCards = updateDetailsCards;
window.getWeatherIcon = getWeatherIcon;
