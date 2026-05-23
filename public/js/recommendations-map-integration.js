(function () {
    'use strict';

    const boundaries = window.SIAYA_BOUNDARIES;
    const soilMapData = window.SIAYA_SOIL_MAP_DATA;
    const villageData = window.SIAYA_VILLAGES_BY_WARD || {};
    const locationHierarchy = window.SIAYA_LOCATION_HIERARCHY || {};

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
    const subLocationColors = ['rgba(249, 199, 79, 0.68)', 'rgba(126, 193, 213, 0.68)', 'rgba(67, 170, 139, 0.64)', 'rgba(215, 122, 43, 0.58)'];

    const svgBox = { width: 820, height: 620, padding: 34 };
    const mapState = {
        selectedWardId: '',
        selectedSubLocation: '',
        selectedVillage: '',
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
        const subLocationSelect = document.getElementById('mapSubLocationSelect');
        const villageSelect = document.getElementById('mapVillageSelect');
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

        subLocationSelect.addEventListener('change', () => {
            if (subLocationSelect.value) {
                selectSubLocation(subLocationSelect.value);
            }
        });

        villageSelect.addEventListener('change', () => {
            if (villageSelect.value) {
                selectVillage(villageSelect.value);
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

    function safeDomId(value) {
        return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    function getFeatureProjectedBounds(feature) {
        const points = [];
        feature.geometry.coordinates.forEach((polygon) => {
            polygon.forEach((ring) => {
                ring.forEach(([lng, lat]) => points.push(projectPoint([lng, lat])));
            });
        });

        return points.reduce((bounds, [x, y]) => ({
            minX: Math.min(bounds.minX, x),
            maxX: Math.max(bounds.maxX, x),
            minY: Math.min(bounds.minY, y),
            maxY: Math.max(bounds.maxY, y)
        }), {
            minX: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY
        });
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

    function getSubLocationsForWard(feature) {
        const configured = locationHierarchy[feature?.ward];
        if (Array.isArray(configured) && configured.length) return configured;
        const flatVillages = villageData[feature?.ward];
        if (Array.isArray(flatVillages) && flatVillages.length) {
            return [{ name: `${feature.ward} Sub-Location`, villages: flatVillages }];
        }
        const ward = feature?.ward || 'Selected Ward';
        return [
            { name: `${ward} North Sub-Location`, villages: [`${ward} Centre`, `North ${ward}`] },
            { name: `${ward} South Sub-Location`, villages: [`South ${ward}`] }
        ];
    }

    function getVillagesForSubLocation(feature, subLocationName = mapState.selectedSubLocation) {
        const subLocations = getSubLocationsForWard(feature);
        const selected = subLocations.find((subLocation) => subLocation.name === subLocationName) || subLocations[0];
        return selected?.villages || [];
    }

    function getAllVillagesForWard(feature) {
        return getSubLocationsForWard(feature).flatMap((subLocation) => subLocation.villages || []);
    }

    function buildVillagePoints(feature) {
        const villages = getVillagesForSubLocation(feature);
        const [centerX, centerY] = projectPoint([feature.centroid.lng, feature.centroid.lat]);
        const radius = 18 + Math.min(14, villages.length * 2);
        return villages.map((name, index) => {
            const angle = ((Math.PI * 2) / villages.length) * index - Math.PI / 2;
            return {
                name,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            };
        });
    }

    function renderSubLocationBoundaries(feature) {
        const layer = document.getElementById('recommendationMapSubLocations');
        if (!layer) return;

        const subLocations = getSubLocationsForWard(feature);
        const bounds = getFeatureProjectedBounds(feature);
        const clipId = `rec-sublocation-clip-${safeDomId(feature.id)}`;
        const height = bounds.maxY - bounds.minY;
        const bandHeight = height / Math.max(subLocations.length, 1);
        const wardPath = buildFeaturePath(feature.geometry);

        layer.innerHTML = `
            <defs>
                <clipPath id="${clipId}">
                    <path d="${wardPath}"></path>
                </clipPath>
            </defs>
            ${subLocations.map((subLocation, index) => {
                const y = bounds.minY + bandHeight * index;
                const isSelected = subLocation.name === mapState.selectedSubLocation;
                return `
                    <g>
                        <rect
                            class="map-sublocation-boundary${isSelected ? ' selected' : ''}"
                            data-sublocation="${subLocation.name}"
                            x="${bounds.minX.toFixed(2)}"
                            y="${y.toFixed(2)}"
                            width="${(bounds.maxX - bounds.minX).toFixed(2)}"
                            height="${bandHeight.toFixed(2)}"
                            fill="${subLocationColors[index % subLocationColors.length]}"
                            clip-path="url(#${clipId})"
                            tabindex="0"
                            role="button"
                            aria-label="${subLocation.name}, ${feature.ward}"
                        ></rect>
                        <text
                            class="map-sublocation-label"
                            x="${((bounds.minX + bounds.maxX) / 2).toFixed(2)}"
                            y="${(y + bandHeight / 2).toFixed(2)}"
                            clip-path="url(#${clipId})"
                        >${subLocation.name.replace(`${feature.ward} `, '')}</text>
                    </g>
                `;
            }).join('')}
        `;

        layer.querySelectorAll('.map-sublocation-boundary').forEach((boundary) => {
            boundary.addEventListener('click', () => selectSubLocation(boundary.dataset.sublocation));
            boundary.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectSubLocation(boundary.dataset.sublocation);
                }
            });
        });
    }

    function renderVillageList(feature) {
        const container = document.getElementById('recommendationVillageList');
        if (!container) return;

        const villages = getVillagesForSubLocation(feature);
        if (!villages.length) {
            container.innerHTML = '<span class="map-village-list-title">Villages in selected sub-location</span><span>No villages available yet.</span>';
            return;
        }

        container.innerHTML = `
            <span class="map-village-list-title">Villages in ${mapState.selectedSubLocation || 'selected sub-location'}</span>
            ${villages.map((village) => `
                <button type="button" class="village-chip${village === mapState.selectedVillage ? ' active' : ''}" data-village="${village}">
                    ${village}
                </button>
            `).join('')}
        `;

        container.querySelectorAll('.village-chip').forEach((button) => {
            button.addEventListener('click', () => selectVillage(button.dataset.village));
        });
    }

    function updateVillageListActive() {
        document.querySelectorAll('#recommendationVillageList .village-chip').forEach((button) => {
            button.classList.toggle('active', button.dataset.village === mapState.selectedVillage);
        });
    }

    function updateSubLocationOptions(feature) {
        const subLocationSelect = document.getElementById('mapSubLocationSelect');
        const subLocations = getSubLocationsForWard(feature);
        subLocationSelect.innerHTML = '<option value="">Select sub-location...</option>' + subLocations.map((subLocation) =>
            `<option value="${subLocation.name}">${subLocation.name}</option>`
        ).join('');
    }

    function updateVillageOptions(feature) {
        const villageSelect = document.getElementById('mapVillageSelect');
        const villages = getVillagesForSubLocation(feature);
        villageSelect.innerHTML = '<option value="">Select village...</option>' + villages.map((village) =>
            `<option value="${village}">${village}</option>`
        ).join('');
    }

    function renderVillageMarkers(feature) {
        const villageLayer = document.getElementById('recommendationMapVillages');
        if (!villageLayer) return;

        const points = buildVillagePoints(feature);
        villageLayer.innerHTML = points.map((point) => `
            <g>
                <circle
                    class="map-village-marker${point.name === mapState.selectedVillage ? ' selected' : ''}"
                    data-village="${point.name}"
                    cx="${point.x.toFixed(2)}"
                    cy="${point.y.toFixed(2)}"
                    r="5"
                    tabindex="0"
                    role="button"
                    aria-label="${point.name}, ${feature.ward}"
                ></circle>
                ${point.name === mapState.selectedVillage ? `<text class="map-village-label selected" x="${point.x.toFixed(2)}" y="${(point.y - 10).toFixed(2)}">${point.name}</text>` : ''}
            </g>
        `).join('');

        villageLayer.querySelectorAll('.map-village-marker').forEach((marker) => {
            marker.addEventListener('click', () => selectVillage(marker.dataset.village));
            marker.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectVillage(marker.dataset.village);
                }
            });
        });
    }

    function selectSubLocation(subLocationName) {
        if (!subLocationName) return;
        mapState.selectedSubLocation = subLocationName;

        const feature = features.find((item) => item.id === mapState.selectedWardId);
        const subLocationSelect = document.getElementById('mapSubLocationSelect');
        const selectedSubLocationDisplay = document.getElementById('selectedSubLocationDisplay');

        if (subLocationSelect) subLocationSelect.value = subLocationName;
        if (selectedSubLocationDisplay) selectedSubLocationDisplay.textContent = subLocationName;

        if (!feature) return;
        updateVillageOptions(feature);
        mapState.selectedVillage = getVillagesForSubLocation(feature, subLocationName)[0] || '';
        renderSubLocationBoundaries(feature);
        renderVillageMarkers(feature);
        renderVillageList(feature);
        selectVillage(mapState.selectedVillage);
    }

    function selectVillage(villageName) {
        if (!villageName) return;
        mapState.selectedVillage = villageName;

        const villageSelect = document.getElementById('mapVillageSelect');
        const selectedVillageDisplay = document.getElementById('selectedVillageDisplay');
        const selectedSubLocationDisplay = document.getElementById('selectedSubLocationDisplay');
        const regionReadout = document.getElementById('regionReadout');
        const feature = features.find((item) => item.id === mapState.selectedWardId);

        if (villageSelect) villageSelect.value = villageName;
        if (selectedVillageDisplay) selectedVillageDisplay.textContent = villageName;
        if (selectedSubLocationDisplay) selectedSubLocationDisplay.textContent = mapState.selectedSubLocation || 'No sub-location selected';
        if (regionReadout && feature) {
            regionReadout.value = `${villageName}, ${mapState.selectedSubLocation}, ${feature.ward}, ${feature.subCounty}`;
        }

        if (feature) renderVillageMarkers(feature);
        updateVillageListActive();
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
        updateSubLocationOptions(feature);
        mapState.selectedSubLocation = getSubLocationsForWard(feature)[0]?.name || '';
        renderSubLocationBoundaries(feature);
        selectSubLocation(mapState.selectedSubLocation);
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
        const selectedSubLocationDisplay = document.getElementById('selectedSubLocationDisplay');
        const selectedVillageDisplay = document.getElementById('selectedVillageDisplay');
        const selectedRegionDisplay = document.getElementById('selectedRegionDisplay');

        locationSelect.value = locationValue;
        regionReadout.value = `${feature.ward}, ${feature.subCounty}`;
        selectedWardDisplay.textContent = feature.ward;
        if (selectedSubLocationDisplay) selectedSubLocationDisplay.textContent = 'No sub-location selected';
        if (selectedVillageDisplay) selectedVillageDisplay.textContent = 'No village selected';
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
        if (event.target && event.target.closest('.map-sublocation-boundary')) return;
        if (event.target && event.target.closest('.map-village-marker')) return;

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
