(function () {
    'use strict';

    const boundaries = window.SIAYA_BOUNDARIES;
    const flatVillageData = window.SIAYA_VILLAGES_BY_WARD || {};

    if (!boundaries || !Array.isArray(boundaries.features)) {
        console.error('Siaya boundary data is missing.');
        return;
    }

    const SUBCOUNTY_COLORS = {
        'Alego Usonga': '#43aa8b',
        'Bondo': '#8ecae6',
        'Gem': '#f9844a',
        'Rarieda': '#577590',
        'Ugenya': '#90be6d',
        'Ugunja': '#f9c74f'
    };
    const SUBCOUNTY_SOIL_PROFILES = {
        'Alego Usonga': {
            soilType: 'Clay loam to loam',
            texture: 'Moderately fine',
            drainage: 'Moderate to well drained',
            ph: '6.2 to 6.6',
            organicMatter: '2.8% to 3.1%',
            nutrients: { nitrogen: '0.20% to 0.22%', phosphorus: '18 to 24 mg/kg', potassium: '0.43 to 0.48 cmol/kg', sulfur: '13 to 15 mg/kg', zinc: '1.5 to 1.9 mg/kg' },
            recommendation: 'A strong maize, bean, and vegetable zone. Compost, residue retention, and balanced basal fertiliser should keep productivity stable.'
        },
        'Bondo': {
            soilType: 'Loam to clay loam',
            texture: 'Medium to moderately fine',
            drainage: 'Moderate drainage',
            ph: '6.0 to 6.4',
            organicMatter: '2.4% to 2.9%',
            nutrients: { nitrogen: '0.17% to 0.20%', phosphorus: '16 to 20 mg/kg', potassium: '0.38 to 0.44 cmol/kg', sulfur: '12 to 14 mg/kg', zinc: '1.3 to 1.6 mg/kg' },
            recommendation: 'Useful for maize, sorghum, cassava, beans, and vegetables with regular manure application and moisture conservation.'
        },
        'Gem': {
            soilType: 'Silt loam to clay loam',
            texture: 'Medium fine',
            drainage: 'Well to moderately well drained',
            ph: '6.2 to 6.7',
            organicMatter: '2.9% to 3.3%',
            nutrients: { nitrogen: '0.20% to 0.23%', phosphorus: '18 to 25 mg/kg', potassium: '0.44 to 0.49 cmol/kg', sulfur: '13 to 16 mg/kg', zinc: '1.5 to 2.0 mg/kg' },
            recommendation: 'High-potential crop area for maize, soybeans, tomatoes, and beans, especially where mulch and top dressing are timed well.'
        },
        'Rarieda': {
            soilType: 'Loam to clay loam',
            texture: 'Balanced to moderately fine',
            drainage: 'Moderate, with wetter pockets near the lake basin',
            ph: '5.8 to 6.3',
            organicMatter: '2.7% to 3.2%',
            nutrients: { nitrogen: '0.18% to 0.20%', phosphorus: '14 to 20 mg/kg', potassium: '0.39 to 0.45 cmol/kg', sulfur: '13 to 16 mg/kg', zinc: '1.2 to 1.7 mg/kg' },
            recommendation: 'Good for mixed farming. In lower and wetter sections, drainage planning is important before intensive cereal or vegetable production.'
        },
        'Ugenya': {
            soilType: 'Loam to clay loam',
            texture: 'Balanced to moderately fine',
            drainage: 'Moderate to well drained',
            ph: '6.1 to 6.6',
            organicMatter: '2.6% to 3.0%',
            nutrients: { nitrogen: '0.18% to 0.22%', phosphorus: '18 to 24 mg/kg', potassium: '0.40 to 0.47 cmol/kg', sulfur: '12 to 15 mg/kg', zinc: '1.3 to 1.9 mg/kg' },
            recommendation: 'Suitable for maize-bean systems, soybeans, groundnuts, and horticulture when phosphorus and organic matter are maintained.'
        },
        'Ugunja': {
            soilType: 'Sandy clay loam to clay loam',
            texture: 'Medium',
            drainage: 'Moderate to well drained',
            ph: '6.0 to 6.4',
            organicMatter: '2.4% to 2.9%',
            nutrients: { nitrogen: '0.17% to 0.20%', phosphorus: '16 to 21 mg/kg', potassium: '0.36 to 0.45 cmol/kg', sulfur: '11 to 14 mg/kg', zinc: '1.2 to 1.7 mg/kg' },
            recommendation: 'Performs well for cassava, maize, beans, and short-season vegetables with timely manure and split nitrogen use.'
        }
    };

    const SVG = {
        width: 820,
        height: 620,
        padding: 34
    };

    const state = {
        selectedSubCounty: '',
        selectedWardId: '',
        selectedVillage: ''
    };

    const features = boundaries.features.map((feature) => ({
        id: feature.properties.wardCode,
        ward: feature.properties.ward,
        subCounty: feature.properties.subCounty,
        centroid: feature.properties.centroid,
        geometry: feature.geometry
    }));

    const subCounties = [...new Set(features.map((feature) => feature.subCounty))].sort();

    const bbox = boundaries.bbox;
    const scaleX = (SVG.width - SVG.padding * 2) / (bbox.east - bbox.west);
    const scaleY = (SVG.height - SVG.padding * 2) / (bbox.north - bbox.south);
    const scale = Math.min(scaleX, scaleY);
    const mapWidth = (bbox.east - bbox.west) * scale;
    const mapHeight = (bbox.north - bbox.south) * scale;
    const offsetX = (SVG.width - mapWidth) / 2;
    const offsetY = (SVG.height - mapHeight) / 2;

    const elements = {};

    document.addEventListener('DOMContentLoaded', () => {
        try {
            bindElements();
            assertRequiredElements();
            buildFilters();
            renderMap();
            renderWardList();
            bindEvents();
            resetSummary();
            selectWard(features[0].id);
        } catch (error) {
            console.error('Siaya soil map failed to initialize:', error);
            const status = document.getElementById('locationStatus');
            if (status) {
                status.textContent = `The soil map could not load on this device: ${error.message || 'unknown error'}. Please refresh the page and try again.`;
            }
        }
    });

    function bindElements() {
        elements.mapRegions = document.getElementById('mapRegions');
        elements.villageLayer = document.getElementById('villageLayer');
        elements.villageList = document.getElementById('soilVillageList');
        elements.subCountyLabels = document.getElementById('subCountyLabels');
        elements.subCountySelect = document.getElementById('subCountySelect');
        elements.wardSelect = document.getElementById('wardSelect');
        elements.villageSelect = document.getElementById('villageSelect');
        elements.wardList = document.getElementById('wardList');
        elements.locationStatus = document.getElementById('locationStatus');
        elements.infoTitle = document.getElementById('infoTitle');
        elements.infoMeta = document.getElementById('infoMeta');
        elements.soilType = document.getElementById('soilTypeValue');
        elements.soilTexture = document.getElementById('soilTextureValue');
        elements.soilDrainage = document.getElementById('soilDrainageValue');
        elements.soilPh = document.getElementById('soilPhValue');
        elements.soilOrganicMatter = document.getElementById('soilOrganicMatterValue');
        elements.nitrogen = document.getElementById('nutrientNitrogen');
        elements.phosphorus = document.getElementById('nutrientPhosphorus');
        elements.potassium = document.getElementById('nutrientPotassium');
        elements.sulfur = document.getElementById('nutrientSulfur');
        elements.zinc = document.getElementById('nutrientZinc');
        elements.recommendation = document.getElementById('wardRecommendation');
        elements.wardBadge = document.getElementById('wardBadge');
        elements.note = document.getElementById('dataNote');
        elements.gpsButton = document.getElementById('gpsLocateButton');
        elements.resetButton = document.getElementById('resetMapButton');
        elements.wardCount = document.getElementById('wardCount');
        elements.selectedCount = document.getElementById('selectedCount');
        elements.coverageLabel = document.getElementById('coverageLabel');
        elements.legend = document.getElementById('mapLegend');
    }

    function assertRequiredElements() {
        const required = [
            'mapRegions',
            'villageLayer',
            'subCountyLabels',
            'subCountySelect',
            'wardSelect',
            'villageSelect',
            'wardList',
            'locationStatus',
            'legend'
        ];
        const missing = required.filter((key) => !elements[key]);
        if (missing.length) {
            throw new Error(`Missing soil map elements: ${missing.join(', ')}`);
        }
    }

    function bindEvents() {
        elements.subCountySelect.addEventListener('change', (event) => {
            const subCounty = event.target.value;
            state.selectedSubCounty = subCounty;
            updateWardSelect();
            updateMapState();
            renderWardList();

            const visible = getVisibleFeatures();
            if (visible.length > 0) {
                selectWard(visible[0].id);
            }
        });

        elements.wardSelect.addEventListener('change', (event) => {
            selectWard(event.target.value);
        });

        elements.villageSelect.addEventListener('change', (event) => {
            selectVillage(event.target.value);
        });

        elements.gpsButton.addEventListener('click', locateUser);
        elements.resetButton.addEventListener('click', resetFilters);

        const mapStage = document.querySelector('.map-stage');
        if (mapStage) {
            mapStage.addEventListener('pointerup', handleMapPointerSelection);
            mapStage.addEventListener('touchend', handleMapPointerSelection, { passive: true });
        }
    }

    function buildFilters() {
        subCounties.forEach((subCounty) => {
            const option = document.createElement('option');
            option.value = subCounty;
            option.textContent = subCounty;
            elements.subCountySelect.appendChild(option);
        });

        elements.legend.innerHTML = subCounties.map((subCounty) => `
            <span class="legend-chip">
                <span class="legend-swatch" style="background:${SUBCOUNTY_COLORS[subCounty] || '#a0aec0'};"></span>
                ${subCounty}
            </span>
        `).join('');

        updateWardSelect();
    }

    function renderMap() {
        const pathMarkup = features.map((feature) => `
            <path
                id="ward-${feature.id}"
                class="ward-shape"
                data-ward-id="${feature.id}"
                data-subcounty="${feature.subCounty}"
                d="${buildFeaturePath(feature.geometry)}"
                fill="${SUBCOUNTY_COLORS[feature.subCounty] || '#d7e3d4'}"
                tabindex="0"
                role="button"
                aria-label="${feature.ward}, ${feature.subCounty}"
            ></path>
        `).join('');

        const labelMarkup = buildSubCountyLabels();

        elements.mapRegions.innerHTML = pathMarkup;
        elements.subCountyLabels.innerHTML = labelMarkup;

        document.querySelectorAll('.ward-shape').forEach((shape) => {
            shape.addEventListener('click', () => selectWard(shape.dataset.wardId));
            shape.addEventListener('touchend', () => selectWard(shape.dataset.wardId), { passive: true });
            shape.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectWard(shape.dataset.wardId);
                }
            });
        });
    }

    function buildSubCountyLabels() {
        return subCounties.map((subCounty) => {
            const items = features.filter((feature) => feature.subCounty === subCounty);
            const lng = items.reduce((sum, item) => sum + item.centroid.lng, 0) / items.length;
            const lat = items.reduce((sum, item) => sum + item.centroid.lat, 0) / items.length;
            const point = project([lng, lat]);
            return `<text class="subcounty-label" x="${point[0]}" y="${point[1]}">${subCounty}</text>`;
        }).join('');
    }

    function buildFeaturePath(geometry) {
        return geometry.coordinates.map((polygon) =>
            polygon.map((ring) =>
                ring.map(([lng, lat], index) => {
                    const [x, y] = project([lng, lat]);
                    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
                }).join(' ') + ' Z'
            ).join(' ')
        ).join(' ');
    }

    function project([lng, lat]) {
        const x = offsetX + (lng - bbox.west) * scale;
        const y = offsetY + (bbox.north - lat) * scale;
        return [x, y];
    }

    function renderWardList() {
        const visible = getVisibleFeatures();
        elements.wardList.innerHTML = visible.map((feature) => `
            <button type="button" class="ward-list-item ${feature.id === state.selectedWardId ? 'active' : ''}" data-ward-id="${feature.id}">
                <span class="ward-list-name">${feature.ward}</span>
                <span class="ward-list-meta">${feature.subCounty} • ${getAllVillagesForWard(feature).length} villages</span>
            </button>
        `).join('');

        document.querySelectorAll('.ward-list-item').forEach((button) => {
            button.addEventListener('click', () => selectWard(button.dataset.wardId));
        });

        elements.wardCount.textContent = `${features.length} wards`;
        elements.coverageLabel.textContent = state.selectedSubCounty || 'County overview';
        elements.selectedCount.textContent = state.selectedVillage || (state.selectedWardId ? '1 ward selected' : 'No ward selected');
    }

    function updateWardSelect() {
        const visible = getVisibleFeatures();
        elements.wardSelect.innerHTML = '<option value="">Select a ward</option>' + visible.map((feature) => (
            `<option value="${feature.id}">${feature.ward}</option>`
        )).join('');
    }

    function updateMapState() {
        document.querySelectorAll('.ward-shape').forEach((shape) => {
            const sameSubCounty = !state.selectedSubCounty || shape.dataset.subcounty === state.selectedSubCounty;
            shape.classList.toggle('dimmed', !sameSubCounty);
            shape.classList.toggle('subcounty-focus', sameSubCounty && !!state.selectedSubCounty);
            shape.classList.toggle('selected', shape.dataset.wardId === state.selectedWardId);
        });
    }

    function selectWard(wardId) {
        if (!wardId) return;

        const feature = features.find((item) => item.id === wardId);
        if (!feature) return;

        state.selectedWardId = wardId;
        state.selectedSubCounty = feature.subCounty;

        if (elements.subCountySelect.value !== state.selectedSubCounty) {
            elements.subCountySelect.value = state.selectedSubCounty;
            updateWardSelect();
        }

        elements.wardSelect.value = wardId;
        updateMapState();
        updateVillageSelect(feature);
        state.selectedVillage = getAllVillagesForWard(feature)[0] || '';
        renderVillageMarkers(feature);
        renderVillageList(feature);
        selectVillage(state.selectedVillage);
        renderWardList();
        updateDetails(feature);
    }

    function updateVillageSelect(feature) {
        const villages = getAllVillagesForWard(feature);
        elements.villageSelect.innerHTML = '<option value="">Select village</option>' + villages.map((village) =>
            `<option value="${village}">${village}</option>`
        ).join('');
    }

    function selectVillage(villageName) {
        if (!villageName) return;

        state.selectedVillage = villageName;
        elements.villageSelect.value = villageName;
        const feature = features.find((item) => item.id === state.selectedWardId);
        if (feature) {
            renderVillageMarkers(feature);
            updateDetails(feature);
        }
        updateVillageListActive();
        renderWardList();
    }

    function updateDetails(feature) {
        const profile = SUBCOUNTY_SOIL_PROFILES[feature.subCounty];

        elements.infoTitle.textContent = state.selectedVillage || feature.ward;
        elements.infoMeta.textContent = `${feature.ward}, ${feature.subCounty}`;
        elements.wardBadge.textContent = state.selectedVillage ? 'Village soil planning profile' : `${feature.ward} ward profile`;
        elements.soilType.textContent = profile.soilType;
        elements.soilTexture.textContent = profile.texture;
        elements.soilDrainage.textContent = profile.drainage;
        elements.soilPh.textContent = profile.ph;
        elements.soilOrganicMatter.textContent = profile.organicMatter;
        elements.nitrogen.textContent = profile.nutrients.nitrogen;
        elements.phosphorus.textContent = profile.nutrients.phosphorus;
        elements.potassium.textContent = profile.nutrients.potassium;
        elements.sulfur.textContent = profile.nutrients.sulfur;
        elements.zinc.textContent = profile.nutrients.zinc;
        elements.recommendation.textContent = profile.recommendation;
        elements.note.textContent = 'Ward boundary geometry is drawn from Siaya ward GeoJSON. Village selections provide finer planning context inside the ward; soil values remain planning profiles grouped by sub-county until measured village soil data is added.';
        elements.locationStatus.textContent = state.selectedVillage
            ? `Showing ${state.selectedVillage}, ${feature.ward}, ${feature.subCounty}.`
            : `Showing ${feature.ward} in ${feature.subCounty}.`;
    }

    function getAllVillagesForWard(feature) {
        const villages = flatVillageData[feature?.ward];
        if (Array.isArray(villages) && villages.length) return villages;
        return [`${feature?.ward || 'Selected Ward'} Village`];
    }

    function renderVillageMarkers(feature) {
        if (!elements.villageLayer) return;

        const villages = getAllVillagesForWard(feature);
        const [centerX, centerY] = project([feature.centroid.lng, feature.centroid.lat]);
        const radius = 18 + Math.min(14, villages.length * 2);

        elements.villageLayer.innerHTML = villages.map((village, index) => {
            const angle = ((Math.PI * 2) / villages.length) * index - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            return `
                <g>
                    <circle
                        class="village-marker${village === state.selectedVillage ? ' selected' : ''}"
                        data-village="${village}"
                        cx="${x.toFixed(2)}"
                        cy="${y.toFixed(2)}"
                        r="5"
                        tabindex="0"
                        role="button"
                        aria-label="${village}, ${feature.ward}"
                    ></circle>
                    ${village === state.selectedVillage ? `<text class="village-label selected" x="${x.toFixed(2)}" y="${(y - 10).toFixed(2)}">${village}</text>` : ''}
                </g>
            `;
        }).join('');

        elements.villageLayer.querySelectorAll('.village-marker').forEach((marker) => {
            marker.addEventListener('click', () => selectVillage(marker.dataset.village));
            marker.addEventListener('touchend', () => selectVillage(marker.dataset.village), { passive: true });
            marker.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectVillage(marker.dataset.village);
                }
            });
        });
    }

    function renderVillageList(feature) {
        if (!elements.villageList) return;

        const villages = getAllVillagesForWard(feature);
        if (!villages.length) {
            elements.villageList.innerHTML = '<span class="village-list-title">Villages in selected ward</span><span>No villages available yet.</span>';
            return;
        }

        elements.villageList.innerHTML = `
            <span class="village-list-title">Villages in ${feature.ward}</span>
            ${villages.map((village) => `
                <button type="button" class="village-chip${village === state.selectedVillage ? ' active' : ''}" data-village="${village}">
                    ${village}
                </button>
            `).join('')}
        `;

        elements.villageList.querySelectorAll('.village-chip').forEach((button) => {
            button.addEventListener('click', () => selectVillage(button.dataset.village));
            button.addEventListener('touchend', () => selectVillage(button.dataset.village), { passive: true });
        });
    }

    function handleMapPointerSelection(event) {
        const target = typeof event.target?.closest === 'function'
            ? event.target.closest('.ward-shape, .village-marker')
            : null;

        if (!target) return;

        if (target.classList.contains('ward-shape')) {
            selectWard(target.dataset.wardId);
            return;
        }

        if (target.classList.contains('village-marker')) {
            selectVillage(target.dataset.village);
        }
    }

    function updateVillageListActive() {
        if (!elements.villageList) return;
        elements.villageList.querySelectorAll('.village-chip').forEach((button) => {
            button.classList.toggle('active', button.dataset.village === state.selectedVillage);
        });
    }

    function getVisibleFeatures() {
        return state.selectedSubCounty
            ? features.filter((feature) => feature.subCounty === state.selectedSubCounty)
            : features;
    }

    async function locateUser() {
        if (!navigator.geolocation) {
            elements.locationStatus.textContent = 'GPS is not supported in this browser.';
            return;
        }

        if (!window.isSecureContext) {
            elements.locationStatus.textContent = 'GPS needs a secure page. Open this map on https:// or localhost and try again.';
            return;
        }

        const permissionState = await getGeolocationPermissionState();

        elements.locationStatus.textContent = permissionState === 'denied'
            ? `Browser reports location as blocked for ${window.location.origin}, but I am checking GPS directly in case that state is stale...`
            : 'Checking your location inside Siaya County...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const nearest = findNearestWard(latitude, longitude);
                if (!nearest) {
                    elements.locationStatus.textContent = 'No ward match was found from your location.';
                    return;
                }

                state.selectedSubCounty = nearest.subCounty;
                elements.subCountySelect.value = nearest.subCounty;
                updateWardSelect();
                selectWard(nearest.id);
                elements.locationStatus.textContent = `Nearest ward from your GPS is ${nearest.ward}, ${nearest.subCounty}.`;
            },
            (error) => {
                elements.locationStatus.textContent = getLocationErrorMessage(error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    async function getGeolocationPermissionState() {
        if (!navigator.permissions || !navigator.permissions.query) {
            return 'unknown';
        }

        try {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            return status.state;
        } catch (error) {
            return 'unknown';
        }
    }

    function getLocationErrorMessage(error) {
        if (error.code === 1) {
            return `Location access was denied for ${window.location.origin}. In Chrome, open site settings for this exact address, not another tab like google.com, set Location to Allow, then reload and try again.`;
        }

        if (error.code === 2) {
            return 'Your location could not be determined. Check that device location services are turned on, then try again.';
        }

        if (error.code === 3) {
            return 'Location lookup timed out. Move to an area with better signal or try again in a few seconds.';
        }

        return 'Unable to retrieve your location right now.';
    }

    function findNearestWard(lat, lng) {
        let best = null;
        let minDistance = Number.POSITIVE_INFINITY;

        features.forEach((feature) => {
            const distance = haversineDistance(lat, lng, feature.centroid.lat, feature.centroid.lng);
            if (distance < minDistance) {
                minDistance = distance;
                best = feature;
            }
        });

        return best;
    }

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const toRad = (value) => value * Math.PI / 180;
        const earthRadiusKm = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    function resetFilters() {
        state.selectedSubCounty = '';
        elements.subCountySelect.value = '';
        updateWardSelect();
        updateMapState();
        renderWardList();
        selectWard(features[0].id);
        elements.locationStatus.textContent = 'Showing full Siaya County ward map.';
    }

    function resetSummary() {
        elements.wardCount.textContent = `${features.length} wards`;
        elements.coverageLabel.textContent = 'County overview';
        elements.selectedCount.textContent = '1 ward selected';
    }
})();
