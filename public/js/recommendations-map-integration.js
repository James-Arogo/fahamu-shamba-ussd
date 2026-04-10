(function () {
    'use strict';

    const boundaries = window.SIAYA_BOUNDARIES;
    const soilMapData = window.SIAYA_SOIL_MAP_DATA;

    if (!boundaries || !Array.isArray(boundaries.features)) {
        return;
    }

    const subCountyColors = {
        'Alego Usonga': '#43aa8b',
        'Bondo': '#8ecae6',
        'Gem': '#f9844a',
        'Rarieda': '#577590',
        'Ugenya': '#90be6d',
        'Ugunja': '#f9c74f'
    };

    const svgBox = { width: 820, height: 620, padding: 34 };
    const mapState = {
        selectedWardId: '',
        selectedSubCounty: '',
        climateSnapshot: null
    };

    window.recommendationMapState = mapState;

    const features = boundaries.features.map((feature) => ({
        id: feature.properties.wardCode,
        ward: feature.properties.ward,
        subCounty: feature.properties.subCounty,
        centroid: feature.properties.centroid,
        geometry: feature.geometry
    }));

    const subCounties = [...new Set(features.map((feature) => feature.subCounty))].sort();
    const bbox = boundaries.bbox;
    const scaleX = (svgBox.width - svgBox.padding * 2) / (bbox.east - bbox.west || 1);
    const scaleY = (svgBox.height - svgBox.padding * 2) / (bbox.north - bbox.south || 1);
    const scale = Math.min(scaleX, scaleY);
    const mapWidth = (bbox.east - bbox.west) * scale;
    const mapHeight = (bbox.north - bbox.south) * scale;
    const offsetX = (svgBox.width - mapWidth) / 2;
    const offsetY = (svgBox.height - mapHeight) / 2;

    document.addEventListener('DOMContentLoaded', () => {
        buildMap();
        bindGpsLocator();
        patchDemoLoader();
        const profileLocation = document.getElementById('location')?.value;
        const matchedFeature = features.find((feature) => normalizeSubCountyForPrediction(feature.subCounty) === profileLocation);
        const firstFeature = matchedFeature || features[0];
        if (firstFeature) {
            selectWard(firstFeature.id);
        }
    });

    function buildMap() {
        const filter = document.getElementById('mapSubCountyFilter');
        const wardSelect = document.getElementById('mapWardSelect');
        const legend = document.getElementById('recommendationMapLegend');
        const regions = document.getElementById('recommendationMapRegions');
        const labels = document.getElementById('recommendationMapLabels');
        const mapStage = document.querySelector('.map-selection-stage');

        filter.innerHTML = '<option value="">All Siaya County</option>' + subCounties.map((subCounty) =>
            `<option value="${subCounty}">${subCounty}</option>`
        ).join('');

        legend.innerHTML = subCounties.map((subCounty) => `
            <span class="legend-chip">
                <span class="legend-swatch" style="background:${subCountyColors[subCounty] || '#d8e6d8'};"></span>
                ${subCounty}
            </span>
        `).join('');

        regions.innerHTML = features.map((feature) => `
            <path
                class="map-ward-shape"
                data-ward-id="${feature.id}"
                data-subcounty="${feature.subCounty}"
                d="${buildFeaturePath(feature.geometry)}"
                fill="${subCountyColors[feature.subCounty] || '#d8e6d8'}"
                tabindex="0"
                role="button"
                aria-label="${feature.ward}, ${feature.subCounty}"
            ></path>
        `).join('');

        labels.innerHTML = subCounties.map((subCounty) => {
            const group = features.filter((feature) => feature.subCounty === subCounty);
            const lng = group.reduce((sum, feature) => sum + feature.centroid.lng, 0) / group.length;
            const lat = group.reduce((sum, feature) => sum + feature.centroid.lat, 0) / group.length;
            const [x, y] = projectPoint([lng, lat]);
            return `<text class="map-subcounty-label" x="${x}" y="${y}">${subCounty}</text>`;
        }).join('');

        document.querySelectorAll('.map-ward-shape').forEach((shape) => {
            shape.addEventListener('click', () => selectWard(shape.dataset.wardId));
            shape.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectWard(shape.dataset.wardId);
                }
            });
        });

        if (mapStage) {
            // Delegate pointer selection so ward picking still works under browser zoom/tap inaccuracies.
            mapStage.addEventListener('pointerup', handleMapPointerSelection);
        }

        filter.addEventListener('change', () => {
            mapState.selectedSubCounty = filter.value;
            updateWardOptions();
            updateMapVisualState();
            const nextFeature = getVisibleFeatures()[0];
            if (nextFeature) {
                selectWard(nextFeature.id);
            }
        });

        wardSelect.addEventListener('change', () => {
            if (wardSelect.value) {
                selectWard(wardSelect.value);
            }
        });

        updateWardOptions();
    }

    function bindGpsLocator() {
        const gpsButton = document.getElementById('gpsLocateRecommendationBtn');
        const gpsHint = document.getElementById('gpsPermissionHint');
        if (!gpsButton) return;

        const setGpsHint = (message) => {
            if (gpsHint) gpsHint.textContent = message;
        };

        const deniedHelpText = 'Location permission is blocked. On Android Chrome: tap the lock icon in the address bar > Permissions/Site settings > Location > Allow, then reload this page.';

        const checkPermissionState = async () => {
            try {
                if (!navigator.permissions || !navigator.permissions.query) return null;
                const status = await navigator.permissions.query({ name: 'geolocation' });
                return status?.state || null;
            } catch {
                return null;
            }
        };

        gpsButton.addEventListener('click', async () => {
            if (!navigator.geolocation) {
                setGpsHint('GPS is not supported on this device/browser.');
                if (typeof window.showToast === 'function') {
                    window.showToast('GPS is not supported on this device/browser.', 'error');
                }
                return;
            }

            const permissionState = await checkPermissionState();
            if (permissionState === 'denied') {
                setGpsHint(deniedHelpText);
                if (typeof window.showToast === 'function') {
                    window.showToast('Location permission is currently blocked in browser settings.', 'error');
                }
                return;
            }

            gpsButton.disabled = true;
            const originalText = gpsButton.innerHTML;
            gpsButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
            setGpsHint('Requesting your GPS location...');

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const nearestFeature = findNearestWard(
                            position.coords.latitude,
                            position.coords.longitude
                        );

                        if (!nearestFeature) {
                            throw new Error('No nearby ward found');
                        }

                        await selectWard(nearestFeature.id);
                        const distanceKm = haversineDistanceKm(
                            position.coords.latitude,
                            position.coords.longitude,
                            nearestFeature.centroid.lat,
                            nearestFeature.centroid.lng
                        );

                        if (typeof window.showToast === 'function') {
                            window.showToast(
                                `Mapped via GPS to ${nearestFeature.ward}, ${nearestFeature.subCounty} (${distanceKm.toFixed(1)} km).`,
                                'success'
                            );
                        }
                        setGpsHint(`GPS mapped successfully to ${nearestFeature.ward}, ${nearestFeature.subCounty}.`);
                    } catch (error) {
                        setGpsHint('Could not map GPS to a ward. You can still select a ward manually from the map.');
                        if (typeof window.showToast === 'function') {
                            window.showToast('Could not map your GPS location to a ward right now.', 'error');
                        }
                    } finally {
                        gpsButton.disabled = false;
                        gpsButton.innerHTML = originalText;
                    }
                },
                (error) => {
                    gpsButton.disabled = false;
                    gpsButton.innerHTML = originalText;

                    const message = error?.code === 1
                        ? 'Location permission denied. Enable GPS permission and try again.'
                        : 'Unable to fetch GPS location right now.';

                    if (error?.code === 1) {
                        setGpsHint(deniedHelpText);
                    } else if (error?.code === 2) {
                        setGpsHint('Location signal unavailable. Ensure GPS/location services are turned on and try again.');
                    } else if (error?.code === 3) {
                        setGpsHint('GPS lookup timed out. Move to an open area and try again.');
                    } else {
                        setGpsHint('GPS lookup failed. You can continue by selecting a ward manually.');
                    }

                    if (typeof window.showToast === 'function') {
                        window.showToast(message, 'error');
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 120000
                }
            );
        });
    }

    function projectPoint([lng, lat]) {
        const x = offsetX + (lng - bbox.west) * scale;
        const y = offsetY + (bbox.north - lat) * scale;
        return [x, y];
    }

    function buildFeaturePath(geometry) {
        return geometry.coordinates.map((polygon) =>
            polygon.map((ring) =>
                ring.map(([lng, lat], index) => {
                    const [x, y] = projectPoint([lng, lat]);
                    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
                }).join(' ') + ' Z'
            ).join(' ')
        ).join(' ');
    }

    function normalizeSubCountyForPrediction(subCountyName) {
        const normalized = String(subCountyName || '').trim().toLowerCase();
        const map = {
            alego: 'Alego Usonga',
            'alego usonga': 'Alego Usonga',
            bondo: 'Bondo',
            gem: 'Gem',
            rarieda: 'Rarieda',
            ugenya: 'Ugenya',
            ugunja: 'Ugunja'
        };
        return map[normalized] || subCountyName;
    }

    function normalizeSubCountyKeyForDataset(subCountyName) {
        const normalized = String(subCountyName || '').trim().toLowerCase();
        const map = {
            'alego usonga': 'alego',
            bondo: 'bondo',
            gem: 'gem',
            rarieda: 'rarieda',
            ugenya: 'ugenya',
            ugunja: 'ugunja'
        };
        return map[normalized] || normalized;
    }

    function deriveSoilCategory(soilTypeText) {
        const value = String(soilTypeText || '').toLowerCase();
        if (value.includes('volcanic')) return 'volcanic';
        if (value.includes('sandy')) return 'sandy';
        if (value.includes('clay')) return 'clay';
        if (value.includes('loam')) return 'loam';
        return '';
    }

    function getWardSoilFromDataset(feature) {
        const wards = soilMapData?.wards;
        if (!Array.isArray(wards) || !feature?.centroid) return null;

        const subCountyKey = normalizeSubCountyKeyForDataset(feature.subCounty);
        const candidates = wards.filter((ward) => normalizeSubCountyKeyForDataset(ward.subCounty) === subCountyKey);
        if (!candidates.length) return null;

        let nearest = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        candidates.forEach((ward) => {
            const distance = haversineDistanceKm(
                Number(feature.centroid.lat),
                Number(feature.centroid.lng),
                Number(ward.lat),
                Number(ward.lng)
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = ward;
            }
        });

        if (!nearest) return null;
        const category = deriveSoilCategory(nearest.soilType);
        if (!category) return null;

        return {
            category,
            label: nearest.soilType,
            source: 'ward_dataset'
        };
    }

    function getLocalSoilFallback(subCountyName) {
        const canonical = normalizeSubCountyForPrediction(subCountyName);
        const fallbackMap = {
            'Alego Usonga': 'loam',
            'Bondo': 'loam',
            'Gem': 'loam',
            'Rarieda': 'loam',
            'Ugenya': 'loam',
            'Ugunja': 'clay'
        };
        return fallbackMap[canonical] || '';
    }

    function getVisibleFeatures() {
        return mapState.selectedSubCounty
            ? features.filter((feature) => feature.subCounty === mapState.selectedSubCounty)
            : features;
    }

    function updateWardOptions() {
        const wardSelect = document.getElementById('mapWardSelect');
        wardSelect.innerHTML = '<option value="">Select a ward from the map...</option>' + getVisibleFeatures().map((feature) =>
            `<option value="${feature.id}">${feature.ward} (${feature.subCounty})</option>`
        ).join('');
    }

    function updateMapVisualState() {
        document.querySelectorAll('.map-ward-shape').forEach((shape) => {
            const matchesFilter = !mapState.selectedSubCounty || shape.dataset.subcounty === mapState.selectedSubCounty;
            shape.classList.toggle('dimmed', !matchesFilter);
            shape.classList.toggle('subcounty-focus', matchesFilter && !!mapState.selectedSubCounty);
            shape.classList.toggle('selected', shape.dataset.wardId === mapState.selectedWardId);
        });
    }

    async function selectWard(wardId) {
        const feature = features.find((item) => item.id === wardId);
        if (!feature) return;

        mapState.selectedWardId = wardId;

        if (mapState.selectedSubCounty && mapState.selectedSubCounty !== feature.subCounty) {
            mapState.selectedSubCounty = feature.subCounty;
            document.getElementById('mapSubCountyFilter').value = feature.subCounty;
            updateWardOptions();
        }

        document.getElementById('mapWardSelect').value = wardId;
        updateMapVisualState();
        syncLocationFields(feature);
        await Promise.all([
            syncSoilProfile(feature),
            syncClimateProfile(feature)
        ]);
    }

    function syncLocationFields(feature) {
        const locationValue = normalizeSubCountyForPrediction(feature.subCounty);
        const locationSelect = document.getElementById('location');
        const regionReadout = document.getElementById('regionReadout');
        const selectedWardDisplay = document.getElementById('selectedWardDisplay');
        const selectedRegionDisplay = document.getElementById('selectedRegionDisplay');

        locationSelect.value = locationValue;
        regionReadout.value = `${feature.ward}, ${feature.subCounty}`;
        selectedWardDisplay.textContent = feature.ward;
        selectedRegionDisplay.textContent = feature.subCounty;
    }

    async function syncSoilProfile(feature) {
        const locationValue = document.getElementById('location').value;
        const soilTypeSelect = document.getElementById('soilType');
        const soilTypeReadout = document.getElementById('soilTypeReadout');
        const selectedSoilDisplay = document.getElementById('selectedSoilDisplay');
        const soilHelperReadout = document.getElementById('soilHelperReadout');
        const soilHelper = document.getElementById('soilHelper');
        const soilInsightText = document.getElementById('soilInsightText');
        const soilSourceBadge = document.getElementById('soilSourceBadge');

        const wardSoil = getWardSoilFromDataset(feature);
        if (wardSoil) {
            soilTypeSelect.value = wardSoil.category;
            soilTypeReadout.value = capitalize(wardSoil.label);
            selectedSoilDisplay.textContent = capitalize(wardSoil.label);
            soilHelperReadout.textContent = `📍 Auto-filled from ward soil dataset for ${feature.ward}.`;
            if (soilHelper) soilHelper.textContent = `Detected ${capitalize(wardSoil.label)} soil for ${feature.ward}.`;
            if (soilInsightText) soilInsightText.textContent = `${feature.ward}, ${feature.subCounty} maps to ${capitalize(wardSoil.label)} in the ward-level soil dataset.`;
            if (soilSourceBadge) soilSourceBadge.style.display = 'inline-flex';
            return;
        }

        try {
            if (typeof window.fetchGeologicalSoilData !== 'function') {
                throw new Error('Soil helper is unavailable');
            }

            const soilData = await window.fetchGeologicalSoilData(locationValue);
            const soilTypeValue = String(soilData.recommendedSoilType || '').trim().toLowerCase();
            soilTypeSelect.value = soilTypeValue;
            soilTypeReadout.value = capitalize(soilTypeValue);
            selectedSoilDisplay.textContent = capitalize(soilTypeValue);
            soilHelperReadout.textContent = `📍 Auto-filled from ${feature.ward} in ${feature.subCounty} using the geological soil profile.`;
            if (soilHelper) soilHelper.textContent = `Detected ${capitalize(soilTypeValue)} soil from ${feature.subCounty} geological profile.`;
            if (soilInsightText) soilInsightText.textContent = `${feature.ward} currently uses ${capitalize(soilTypeValue)} from the geological soil profile.`;
            if (soilSourceBadge) soilSourceBadge.style.display = 'inline-flex';
        } catch (error) {
            const fallbackSoil = getLocalSoilFallback(feature.subCounty);
            if (fallbackSoil) {
                soilTypeSelect.value = fallbackSoil;
                soilTypeReadout.value = capitalize(fallbackSoil);
                selectedSoilDisplay.textContent = capitalize(fallbackSoil);
                soilHelperReadout.textContent = `📍 Auto-filled from ${feature.subCounty} local soil fallback profile.`;
                if (soilHelper) soilHelper.textContent = `Detected ${capitalize(fallbackSoil)} soil from ${feature.subCounty} fallback profile.`;
                if (soilInsightText) soilInsightText.textContent = `${feature.ward} has no direct row in the soil API yet, so we used ${feature.subCounty} fallback soil data.`;
                if (soilSourceBadge) soilSourceBadge.style.display = 'inline-flex';
                return;
            }

            soilTypeSelect.value = '';
            soilTypeReadout.value = '';
            selectedSoilDisplay.textContent = 'Unavailable';
            soilHelperReadout.textContent = '📍 Soil type could not be loaded from the selected region right now.';
            if (soilHelper) soilHelper.textContent = 'We could not fetch soil data automatically. Please choose the soil type manually.';
            if (soilInsightText) soilInsightText.textContent = 'Automatic soil detection is unavailable for this ward right now.';
            if (soilSourceBadge) soilSourceBadge.style.display = 'none';
        }
    }

    async function syncClimateProfile(feature) {
        const climateInsightText = document.getElementById('climateInsightText');
        const climateSourceBadge = document.getElementById('climateSourceBadge');
        const selectedClimateDisplay = document.getElementById('selectedClimateDisplay');

        climateInsightText.textContent = `Loading climate for ${feature.ward}...`;

        try {
            const response = await fetch(
                `/api/weather/current-by-coords?lat=${encodeURIComponent(feature.centroid.lat)}&lon=${encodeURIComponent(feature.centroid.lng)}&ward=${encodeURIComponent(feature.ward)}&subcounty=${encodeURIComponent(feature.subCounty)}`
            );
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Climate data unavailable');
            }

            mapState.climateSnapshot = payload.data;
            selectedClimateDisplay.textContent = `${payload.data.temperature}°C • ${payload.data.humidity}% humidity`;
            climateInsightText.textContent = `${feature.ward} is currently at ${payload.data.temperature}°C with ${payload.data.description}, ${payload.data.humidity}% humidity, and ${payload.data.precipitation ?? payload.data.rain ?? 0} mm precipitation.`;
            climateSourceBadge.style.display = 'inline-flex';
        } catch (error) {
            mapState.climateSnapshot = null;
            selectedClimateDisplay.textContent = 'Unavailable';
            climateInsightText.textContent = `Climate data could not be loaded for ${feature.ward} right now.`;
            climateSourceBadge.style.display = 'none';
        }
    }

    function patchDemoLoader() {
        if (typeof window.loadDemoData !== 'function') return;

        const original = window.loadDemoData;
        window.loadDemoData = function patchedLoadDemoData() {
            const demos = [
                { subCounty: 'Bondo', season: 'long_rains', farmSize: 2.5, waterSource: 'Rainfall' },
                { subCounty: 'Ugunja', season: 'short_rains', farmSize: 1.8, waterSource: 'Well' },
                { subCounty: 'Alego Usonga', season: 'short_rains', farmSize: 2, waterSource: 'Rainfall' }
            ];
            const demo = demos[Math.floor(Math.random() * demos.length)];
            const feature = features.find((item) => item.subCounty === demo.subCounty);
            document.getElementById('season').value = demo.season;
            document.getElementById('farmSize').value = demo.farmSize;
            document.getElementById('waterSource').value = demo.waterSource;

            if (feature) {
                selectWard(feature.id).then(() => {
                    if (typeof window.updateBudgetEstimate === 'function') {
                        window.updateBudgetEstimate();
                    }
                    if (typeof window.showToast === 'function') {
                        window.showToast('Demo data loaded from map selection!', 'success');
                    }
                });
                return;
            }

            original();
        };
    }

    function capitalize(text) {
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
    }

    function handleMapPointerSelection(event) {
        if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
        if (event.target && event.target.closest('.map-ward-shape')) return;

        const mapStage = document.querySelector('.map-selection-stage');
        if (!mapStage || typeof mapStage.createSVGPoint !== 'function') return;

        const svgPoint = mapStage.createSVGPoint();
        svgPoint.x = event.clientX;
        svgPoint.y = event.clientY;

        const ctm = mapStage.getScreenCTM();
        if (!ctm) return;

        const localPoint = svgPoint.matrixTransform(ctm.inverse());
        const hitWardId = resolveWardIdFromSvgPoint(localPoint, mapStage);
        if (hitWardId) {
            selectWard(hitWardId);
        }
    }

    function resolveWardIdFromSvgPoint(localPoint, mapStage) {
        const shapes = Array.from(document.querySelectorAll('.map-ward-shape'));
        if (!shapes.length) return '';

        for (const shape of shapes) {
            if (typeof shape.isPointInFill === 'function' && shape.isPointInFill(localPoint)) {
                return shape.dataset.wardId || '';
            }
        }

        // Fallback: pick nearest centroid if direct hit-testing misses at high/low zoom.
        let nearestWardId = '';
        let nearestDistancePx = Number.POSITIVE_INFINITY;
        features.forEach((feature) => {
            const [x, y] = projectPoint([feature.centroid.lng, feature.centroid.lat]);
            const dx = localPoint.x - x;
            const dy = localPoint.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < nearestDistancePx) {
                nearestDistancePx = distance;
                nearestWardId = feature.id;
            }
        });

        const mapDiagonal = Math.sqrt((mapStage.viewBox.baseVal.width ** 2) + (mapStage.viewBox.baseVal.height ** 2));
        const adaptiveThreshold = Math.max(48, mapDiagonal * 0.08);
        return nearestDistancePx <= adaptiveThreshold ? nearestWardId : '';
    }

    function findNearestWard(lat, lng) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        let nearest = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        features.forEach((feature) => {
            const distance = haversineDistanceKm(
                lat,
                lng,
                Number(feature.centroid.lat),
                Number(feature.centroid.lng)
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = feature;
            }
        });

        return nearest;
    }

    function haversineDistanceKm(lat1, lon1, lat2, lon2) {
        const toRadians = (value) => (value * Math.PI) / 180;
        const earthRadiusKm = 6371;

        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }
})();
