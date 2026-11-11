/* GLOBAL STATE */
        let currentCityData = {
            name: 'Salvador',
            state: 'Bahia',
            country: 'Brasil',
            lat: -12.9714,
            lon: -38.5014
        };

        let hourlyChartInstance = null;
        let autocompleteDebounceTimer = null;
        let hourlyDataGlobal = null;
        let citySuggestionsGlobal = [];
        let citySuggestionRequestId = 0;
        let searchRequestId = 0;
        let locationRequestId = 0;
        let weatherRequestId = 0;

        /* WMO WEATHER CODES MAPPER */
        const WMO_CODES = {
            0: { label: 'Céu Limpo', icon: 'fa-sun', color: 'text-yellow-400', advice: 'Excelente dia para atividades ao ar livre!' },
            1: { label: 'Predominantemente Ensolarado', icon: 'fa-cloud-sun', color: 'text-amber-400', advice: 'Dia agradável e ensolarado.' },
            2: { label: 'Parcialmente Nublado', icon: 'fa-cloud-sun', color: 'text-gray-300', advice: 'Algumas nuvens no céu, bom clima.' },
            3: { label: 'Encoberto', icon: 'fa-cloud', color: 'text-gray-400', advice: 'Tempo fechado com muitas nuvens.' },
            45: { label: 'Nevoeiro', icon: 'fa-smog', color: 'text-gray-400', advice: 'Atenção ao dirigir devido à baixa visibilidade.' },
            48: { label: 'Nevoeiro com Geada', icon: 'fa-smog', color: 'text-blue-200', advice: 'Cuidado nas estradas com gelo.' },
            51: { label: 'Garoa Leve', icon: 'fa-cloud-rain', color: 'text-blue-300', advice: 'Uma garoa fina pode ocorrer.' },
            53: { label: 'Garoa Moderada', icon: 'fa-cloud-rain', color: 'text-blue-400', advice: 'Recomendável levar um guarda-chuva leve.' },
            55: { label: 'Garoa Densa', icon: 'fa-cloud-showers-heavy', color: 'text-blue-500', advice: 'Leve um guarda-chuva.' },
            61: { label: 'Chuva Leve', icon: 'fa-cloud-rain', color: 'text-blue-400', advice: 'Chuva fraca intermitente.' },
            63: { label: 'Chuva Moderada', icon: 'fa-cloud-showers-heavy', color: 'text-blue-500', advice: 'Não se esqueça do guarda-chuva!' },
            65: { label: 'Chuva Forte', icon: 'fa-cloud-showers-water', color: 'text-blue-600', advice: 'Chuva intensa. Evite áreas sujeitas a alagamentos.' },
            71: { label: 'Neve Leve', icon: 'fa-snowflake', color: 'text-cyan-200', advice: 'Queda leve de neve.' },
            73: { label: 'Neve Moderada', icon: 'fa-snowflake', color: 'text-cyan-300', advice: 'Neve moderada na região.' },
            75: { label: 'Neve Intensa', icon: 'fa-snowflake', color: 'text-cyan-400', advice: 'Nevasca forte. Agasalhe-se bem.' },
            80: { label: 'Pancadas de Chuva Leves', icon: 'fa-cloud-sun-rain', color: 'text-blue-400', advice: 'Possibilidade de pancadas rápidas de chuva.' },
            81: { label: 'Pancadas de Chuva Moderadas', icon: 'fa-cloud-showers-heavy', color: 'text-blue-500', advice: 'Pancadas de chuva frequentes.' },
            82: { label: 'Pancadas de Chuva Violentas', icon: 'fa-cloud-showers-water', color: 'text-purple-400', advice: 'Tempestade torrencial isolada.' },
            95: { label: 'Tempestade com Raios', icon: 'fa-bolt text-yellow-400', color: 'text-yellow-400', advice: 'Cuidado! Tempestade elétrica na região.' },
            96: { label: 'Tempestade com Granizo Leve', icon: 'fa-cloud-bolt', color: 'text-red-400', advice: 'Risco de granizo e rajadas de vento.' },
            99: { label: 'Tempestade com Granizo Forte', icon: 'fa-cloud-bolt', color: 'text-red-500', advice: 'Alerta! Tempestade severa de granizo.' }
        };

        /* INITIALIZATION */
        window.addEventListener('DOMContentLoaded', () => {
            // Check saved theme
            const savedTheme = localStorage.getItem('apimeteo_theme');
            setTheme(savedTheme === 'light' ? 'light' : 'dark');

            // Load initial city
            fetchWeatherData(currentCityData.lat, currentCityData.lon);

            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', () => handleSearchInput(searchInput.value));
            searchInput.addEventListener('keydown', handleSearchKeyDown);

            // Close search dropdown on outside click
            document.addEventListener('click', (e) => {
                const actionTarget = e.target.closest('[data-action]');
                if (actionTarget) {
                    handleActionClick(actionTarget);
                }

                const searchDropdown = document.getElementById('autocompleteResults');
                const searchInput = document.getElementById('searchInput');
                if (!searchDropdown.contains(e.target) && e.target !== searchInput) {
                    searchDropdown.classList.add('hidden');
                }

            });
        });

        function handleActionClick(target) {
            switch (target.dataset.action) {
                case 'toggle-theme':
                    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
                    break;
                case 'refresh-data':
                    refreshData();
                    break;
                case 'get-location':
                    getUserLocation();
                    break;
                case 'execute-search':
                    executeSearch();
                    break;
                case 'load-city':
                    loadCityByCoords(
                        Number(target.dataset.cityLat),
                        Number(target.dataset.cityLon),
                        target.dataset.cityName,
                        target.dataset.cityState,
                        target.dataset.cityCountry
                    );
                    break;
                case 'hide-error':
                    hideError();
                    break;
                case 'switch-hourly-view':
                    switchHourlyView(target.dataset.view);
                    break;
                case 'select-city': {
                    const city = citySuggestionsGlobal[Number(target.dataset.cityIndex)];
                    if (city) {
                        selectCityFromDropdown(
                            city.latitude,
                            city.longitude,
                            city.name || '',
                            city.admin1 || '',
                            city.country || ''
                        );
                    }
                    break;
                }
            }
        }

        /* THEME MANAGEMENT */
        function setTheme(theme) {
            if (theme !== 'dark' && theme !== 'light') {
                throw new Error(`Tema inválido: ${theme}`);
            }

            const html = document.documentElement;
            html.setAttribute('data-theme', theme);
            html.classList.toggle('dark', theme !== 'light');
            localStorage.setItem('apimeteo_theme', theme);

            const themeToggle = document.getElementById('themeToggleBtn');
            const nextThemeLabel = theme === 'dark' ? 'claro' : 'escuro';
            themeToggle.setAttribute('aria-label', `Ativar tema ${nextThemeLabel}`);
            themeToggle.title = `Ativar tema ${nextThemeLabel}`;

            // Re-render chart if active to match theme colors
            if (hourlyChartInstance && hourlyDataGlobal) {
                renderHourlyChart(hourlyDataGlobal);
            }
        }

        /* SEARCH & AUTOCOMPLETE */
        function handleSearchInput(query) {
            clearTimeout(autocompleteDebounceTimer);
            searchRequestId++;
            locationRequestId++;
            const requestId = ++citySuggestionRequestId;
            const dropdown = document.getElementById('autocompleteResults');

            if (!query || query.trim().length < 2) {
                dropdown.classList.add('hidden');
                return;
            }

            autocompleteDebounceTimer = setTimeout(() => {
                fetchCitySuggestions(query.trim(), requestId);
            }, 300);
        }

        function handleSearchKeyDown(e) {
            if (e.key === 'Enter') {
                executeSearch();
            }
        }

        async function fetchCitySuggestions(query, requestId) {
            const dropdown = document.getElementById('autocompleteResults');
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt&format=json`);
                if (!res.ok) throw new Error('Erro ao buscar sugestões');
                const data = await res.json();
                if (requestId !== citySuggestionRequestId) return;

                if (!data.results || data.results.length === 0) {
                    citySuggestionsGlobal = [];
                    dropdown.innerHTML = `<div class="p-3 text-xs text-brand-textMuted text-center">Nenhuma cidade encontrada</div>`;
                    dropdown.classList.remove('hidden');
                    return;
                }

                citySuggestionsGlobal = data.results;
                dropdown.replaceChildren();
                data.results.forEach((city, index) => {
                    const row = document.createElement('div');
                    row.dataset.action = 'select-city';
                    row.dataset.cityIndex = String(index);
                    row.className = 'p-3 hover:bg-brand-cardHover cursor-pointer flex items-center justify-between text-xs transition-colors';

                    const details = document.createElement('div');
                    details.className = 'flex items-center gap-2';

                    const flag = document.createElement('span');
                    flag.textContent = getFlagEmoji(city.country_code);
                    const name = document.createElement('span');
                    name.className = 'font-bold text-brand-textMain';
                    name.textContent = city.name || '';
                    const location = document.createElement('span');
                    location.className = 'text-brand-textMuted';
                    location.textContent = `${city.admin1 ? `, ${city.admin1}` : ''}${city.country ? ` - ${city.country}` : ''}`;
                    details.append(flag, name, location);

                    const coordinates = document.createElement('span');
                    coordinates.className = 'text-[10px] font-mono text-brand-textMuted';
                    coordinates.textContent = `${city.latitude.toFixed(2)}°, ${city.longitude.toFixed(2)}°`;
                    row.append(details, coordinates);
                    dropdown.appendChild(row);
                });
                dropdown.classList.remove('hidden');
            } catch (err) {
                if (requestId === citySuggestionRequestId) {
                    console.error(err);
                    dropdown.classList.add('hidden');
                }
            }
        }

        function selectCityFromDropdown(lat, lon, name, state, country) {
            clearTimeout(autocompleteDebounceTimer);
            citySuggestionRequestId++;
            document.getElementById('searchInput').value = `${name}${state ? ', ' + state : ''}`;
            document.getElementById('autocompleteResults').classList.add('hidden');
            loadCityByCoords(lat, lon, name, state, country);
        }

        async function executeSearch() {
            const inputVal = document.getElementById('searchInput').value.trim();
            if (!inputVal) return;

            const requestId = ++searchRequestId;
            citySuggestionRequestId++;
            locationRequestId++;
            clearTimeout(autocompleteDebounceTimer);
            document.getElementById('autocompleteResults').classList.add('hidden');

            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputVal)}&count=1&language=pt&format=json`);
                if (!res.ok) throw new Error('Falha no serviço de localização');
                const data = await res.json();
                if (requestId !== searchRequestId) return;

                if (!data.results || data.results.length === 0) {
                    showError(`Cidade "${inputVal}" não encontrada. Verifique a ortografia.`);
                    return;
                }

                const city = data.results[0];
                loadCityByCoords(city.latitude, city.longitude, city.name, city.admin1 || '', city.country || '');
            } catch (err) {
                if (requestId === searchRequestId) {
                    showError('Erro ao buscar localização. Tente novamente.');
                }
            }
        }

        function loadCityByCoords(lat, lon, name, state, country) {
            searchRequestId++;
            citySuggestionRequestId++;
            locationRequestId++;
            clearTimeout(autocompleteDebounceTimer);
            document.getElementById('autocompleteResults').classList.add('hidden');
            fetchWeatherData(lat, lon, { name, state, country, lat, lon });
        }

        /* GEOLOCATION */
        function getUserLocation() {
            const requestId = ++locationRequestId;
            searchRequestId++;
            citySuggestionRequestId++;
            clearTimeout(autocompleteDebounceTimer);
            if (!navigator.geolocation) {
                showError('Geolocalização não é suportada pelo seu navegador.');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    if (requestId !== locationRequestId) return;
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    try {
                        // Reverse geocoding attempt using Nominatim / BigDataCloud fallback
                        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
                        if (requestId !== locationRequestId) return;
                        let city = 'Sua Localização';
                        let state = '';
                        let country = '';

                        if (res.ok) {
                            const data = await res.json();
                            city = data.city || data.locality || data.principalSubdivision || 'Sua Localização';
                            state = data.principalSubdivision || '';
                            country = data.countryName || '';
                        }

                        loadCityByCoords(lat, lon, city, state, country);
                    } catch (e) {
                        if (requestId === locationRequestId) {
                            loadCityByCoords(lat, lon, 'Sua Localização', '', '');
                        }
                    }
                },
                (err) => {
                    if (requestId === locationRequestId) {
                        showError('Permissão de localização negada ou indisponível.');
                    }
                },
                { timeout: 10000 }
            );
        }

        /* FETCH WEATHER DATA FROM OPEN-METEO */
        async function fetchWeatherData(lat, lon, cityData = currentCityData) {
            const requestId = ++weatherRequestId;
            showSpinner();
            hideError();

            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,uv_index,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&timezone=auto`;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    const errJson = await response.json().catch(() => ({}));
                    throw new Error(errJson.reason || `Erro HTTP ${response.status}`);
                }
                const data = await response.json();
                if (requestId !== weatherRequestId) return;

                currentCityData = cityData;
                renderCurrentWeather(data.current, data.daily);
                renderDetailedMetrics(data.current, data.daily);
                renderHourlyForecast(data.hourly, data.current.time);
                renderDailyForecast(data.daily);
            } catch (err) {
                if (requestId === weatherRequestId) {
                    console.error('Falha ao carregar dados meteorológicos:', err);
                    showError(`Não foi possível carregar os dados meteorológicos (${err.message}). A última previsão válida foi mantida.`);
                }
            } finally {
                if (requestId === weatherRequestId) hideSpinner();
            }
        }

        /* RENDER FUNCTIONS */
        function renderCurrentWeather(current, daily) {
            // Location Title
            const locText = `${currentCityData.name}${currentCityData.state ? ', ' + currentCityData.state : ''}${currentCityData.country ? ' - ' + currentCityData.country : ''}`;
            document.getElementById('locationBadge').textContent = locText;

            // Updated time
            const now = new Date();
            document.getElementById('lastUpdated').textContent = `Atualizado às ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

            // Temperature & Feels
            document.getElementById('currentTemp').textContent = `${Math.round(current.temperature_2m)}°C`;
            document.getElementById('feelsLike').textContent = `Sensação térmica: ${Math.round(current.apparent_temperature)}°C`;

            // High & Low today
            if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length > 0) {
                document.getElementById('todayMax').textContent = `${Math.round(daily.temperature_2m_max[0])}°C`;
                document.getElementById('todayMin').textContent = `${Math.round(daily.temperature_2m_min[0])}°C`;
                document.getElementById('todayRainProb').textContent = `${daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0}%`;
            }

            // Weather Code & Advice
            const wmo = WMO_CODES[current.weather_code] || { label: 'Desconhecido', icon: 'fa-cloud', color: 'text-gray-400', advice: '' };
            document.getElementById('weatherCondition').textContent = wmo.label;
            document.getElementById('weatherAdvice').textContent = wmo.advice;

            // Main Icon
            const iconContainer = document.getElementById('mainWeatherIconContainer');
            let isDay = current.is_day !== undefined ? current.is_day : 1;
            let iconClass = wmo.icon;

            // Adjust clear sky for night
            if (current.weather_code === 0 && !isDay) {
                iconClass = 'fa-moon';
            } else if (current.weather_code === 1 && !isDay) {
                iconClass = 'fa-cloud-moon';
            }

            iconContainer.className = `text-7xl sm:text-8xl my-2 filter drop-shadow-lg transition-transform hover:scale-105 duration-300 ${wmo.color}`;
            iconContainer.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        }

        function renderDetailedMetrics(current, daily) {
            // Humidity
            const hum = current.relative_humidity_2m;
            document.getElementById('humidityVal').textContent = `${hum}%`;
            document.getElementById('humidityBar').style.width = `${hum}%`;
            document.getElementById('humidityStatus').textContent = hum < 30 ? 'Ar Seco (Atenção)' : hum > 80 ? 'Umidade Elevada' : 'Ideal & Confortável';

            // Wind
            const windSpeed = Math.round(current.wind_speed_10m);
            const windDeg = current.wind_direction_10m;
            document.getElementById('windSpeedVal').textContent = `${windSpeed} km/h`;
            document.getElementById('windDirText').textContent = `DIR: ${getWindCardinal(windDeg)} (${windDeg}°)`;
            document.getElementById('windDirectionArrow').style.transform = `rotate(${windDeg}deg)`;

            // UV Index (from daily max UV)
            const uvIndex = Number.isFinite(current.uv_index) ? current.uv_index : null;
            document.getElementById('uvVal').textContent = uvIndex === null ? '--' : uvIndex.toFixed(1);
            const uvBadge = document.getElementById('uvBadge');
            if (uvIndex === null) {
                uvBadge.textContent = 'Indisponível';
                uvBadge.className = 'inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded bg-gray-500/20 text-gray-400';
            } else {
                const uvInfo = getUVCategory(uvIndex);
                uvBadge.textContent = uvInfo.text;
                uvBadge.className = `inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded ${uvInfo.bgColor} ${uvInfo.textColor}`;
            }
            document.getElementById('uvBar').style.width = `${uvIndex === null ? 0 : Math.min((uvIndex / 12) * 100, 100)}%`;

            // Atmospheric Pressure
            const pressure = Math.round(current.pressure_msl);
            document.getElementById('pressureVal').textContent = `${pressure} hPa`;
            document.getElementById('pressureStatus').textContent = pressure < 1010 ? 'Baixa (Possível Chuva)' : 'Normal / Alta';

            // Precipitation
            const precipSum = daily && daily.precipitation_sum ? daily.precipitation_sum[0] : 0;
            const precipProbMax = daily && daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
            document.getElementById('precipVal').textContent = `${precipSum.toFixed(1)} mm`;
            document.getElementById('precipProb').textContent = `Probabilidade: ${precipProbMax}%`;

            // Sunrise & Sunset
            if (daily && daily.sunrise && daily.sunset) {
                document.getElementById('sunriseVal').textContent = daily.sunrise[0].slice(11, 16);
                document.getElementById('sunsetVal').textContent = daily.sunset[0].slice(11, 16);
            }
        }

        function renderHourlyForecast(hourly, currentTime) {
            hourlyDataGlobal = hourly;
            const container = document.getElementById('hourlyCardsContainer');
            container.innerHTML = '';

            // Open-Meteo returns local times without an offset; compare its own timestamps.
            const currentHour = currentTime.slice(0, 13);
            let startIndex = hourly.time.findIndex(time => time.slice(0, 13) >= currentHour);
            if (startIndex === -1) startIndex = 0;

            // Render next 24 hours
            for (let i = startIndex; i < startIndex + 24 && i < hourly.time.length; i++) {
                const timeStr = hourly.time[i].slice(11, 16);
                const temp = Math.round(hourly.temperature_2m[i]);
                const pop = hourly.precipitation_probability[i] || 0;
                const code = hourly.weather_code[i];
                const wmo = WMO_CODES[code] || { icon: 'fa-cloud', color: 'text-gray-400' };

                const card = document.createElement('div');
                card.className = 'flex flex-col items-center justify-between p-3 rounded-xl bg-brand-darkBg border border-brand-border min-w-[85px] text-center space-y-2 shrink-0 hover:border-brand-orange transition-all';
                card.innerHTML = `
                    <span class="text-xs font-mono font-semibold text-brand-textMuted">${timeStr}</span>
                    <i class="fa-solid ${wmo.icon} text-xl ${wmo.color}"></i>
                    <span class="text-sm font-bold font-mono text-brand-textMain">${temp}°C</span>
                    <span class="text-[10px] text-blue-400 font-medium flex items-center gap-0.5">
                        <i class="fa-solid fa-umbrella text-[9px]"></i> ${pop}%
                    </span>
                `;
                container.appendChild(card);
            }

            if (!document.getElementById('hourlyChartContainer').classList.contains('hidden')) {
                renderHourlyChart(hourly, startIndex);
            }
        }

        function renderHourlyChart(hourly, startIndex = 0) {
            if (typeof Chart === 'undefined') {
                showError('O gráfico não está disponível. Verifique sua conexão e tente novamente.');
                switchHourlyView('cards');
                return;
            }

            const ctx = document.getElementById('hourlyChart').getContext('2d');
            const hours = [];
            const temps = [];
            const pops = [];

            for (let i = startIndex; i < startIndex + 24 && i < hourly.time.length; i++) {
                hours.push(hourly.time[i].slice(11, 16));
                temps.push(hourly.temperature_2m[i]);
                pops.push(hourly.precipitation_probability[i]);
            }

            if (hourlyChartInstance) {
                hourlyChartInstance.destroy();
            }

            const accentColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--brand-orange')
                .trim();

            hourlyChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: hours,
                    datasets: [
                        {
                            label: 'Temperatura (°C)',
                            data: temps,
                            borderColor: accentColor,
                            backgroundColor: 'rgba(255, 102, 0, 0.1)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Chuva (%)',
                            data: pops,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 1.5,
                            borderDash: [4, 4],
                            tension: 0.4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim(),
                                font: { family: 'Inter', size: 11 }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: getComputedStyle(document.body).getPropertyValue('--chart-grid').trim() },
                            ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim(), font: { size: 10 } }
                        },
                        y: {
                            type: 'linear',
                            position: 'left',
                            grid: { color: getComputedStyle(document.body).getPropertyValue('--chart-grid').trim() },
                            ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim(), font: { size: 10 } }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            min: 0,
                            max: 100,
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#3b82f6', font: { size: 10 } }
                        }
                    }
                }
            });
        }

        function switchHourlyView(view) {
            const cardsContainer = document.getElementById('hourlyCardsContainer');
            const chartContainer = document.getElementById('hourlyChartContainer');
            const cardsBtn = document.getElementById('viewCardsBtn');
            const chartBtn = document.getElementById('viewChartBtn');

            if (view === 'cards') {
                cardsContainer.classList.remove('hidden');
                chartContainer.classList.add('hidden');
                cardsBtn.className = 'px-3 py-1 rounded-md bg-brand-cardBg accent-color font-semibold transition-all';
                chartBtn.className = 'px-3 py-1 rounded-md text-brand-textMuted hover:text-brand-textMain transition-all';
            } else {
                if (hourlyDataGlobal) {
                    if (typeof Chart === 'undefined') {
                        showError('O gráfico não está disponível. Verifique sua conexão e tente novamente.');
                        return;
                    }
                    cardsContainer.classList.add('hidden');
                    chartContainer.classList.remove('hidden');
                    chartBtn.className = 'px-3 py-1 rounded-md bg-brand-cardBg accent-color font-semibold transition-all';
                    cardsBtn.className = 'px-3 py-1 rounded-md text-brand-textMuted hover:text-brand-textMain transition-all';
                    renderHourlyChart(hourlyDataGlobal);
                }
            }
        }

        function renderDailyForecast(daily) {
            const container = document.getElementById('dailyForecastContainer');
            container.innerHTML = '';

            const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

            for (let i = 0; i < daily.time.length; i++) {
                const dateObj = new Date(daily.time[i] + 'T00:00:00');
                const dayName = i === 0 ? 'Hoje' : daysOfWeek[dateObj.getDay()];
                const dateFormatted = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;

                const code = daily.weather_code[i];
                const wmo = WMO_CODES[code] || { label: 'Variável', icon: 'fa-cloud', color: 'text-gray-400' };
                const max = Math.round(daily.temperature_2m_max[i]);
                const min = Math.round(daily.temperature_2m_min[i]);
                const pop = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

                const row = document.createElement('div');
                row.className = 'py-3.5 flex items-center justify-between text-xs sm:text-sm gap-2 hover:bg-brand-cardHover px-2 rounded-lg transition-colors';
                row.innerHTML = `
                    <div class="w-28 sm:w-36 font-semibold flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                        <span class="text-brand-textMain capitalize">${dayName}</span>
                        <span class="text-[10px] sm:text-xs text-brand-textMuted font-mono">${dateFormatted}</span>
                    </div>

                    <div class="flex items-center gap-2 flex-1">
                        <i class="fa-solid ${wmo.icon} text-lg ${wmo.color} w-6 text-center"></i>
                        <span class="text-xs text-brand-textMuted hidden md:inline truncate max-w-[150px]">${wmo.label}</span>
                    </div>

                    <div class="w-16 text-right text-xs text-blue-400 font-medium">
                        ${pop > 0 ? `<i class="fa-solid fa-umbrella text-[10px]"></i> ${pop}%` : '<span class="opacity-40">-</span>'}
                    </div>

                    <div class="flex items-center gap-3 w-32 justify-end font-mono">
                        <span class="text-blue-400 font-bold">${min}°C</span>
                        <div class="w-12 bg-brand-darkBg h-1.5 rounded-full overflow-hidden hidden sm:block border border-brand-border">
                            <div class="accent-bg h-full rounded-full forecast-temp-range"></div>
                        </div>
                        <span class="text-red-400 font-bold">${max}°C</span>
                    </div>
                `;
                row.querySelector('.forecast-temp-range').style.setProperty(
                    '--forecast-temp-range',
                    `${Math.min(Math.max((max - min) * 5, 20), 100)}%`
                );
                container.appendChild(row);
            }
        }

        /* HELPERS & UTILS */
        function getWindCardinal(deg) {
            const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
            return directions[Math.round(deg / 45) % 8];
        }

        function getUVCategory(uv) {
            if (uv <= 2) return { text: 'Baixo', bgColor: 'bg-green-500/20', textColor: 'text-green-400' };
            if (uv <= 5) return { text: 'Moderado', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' };
            if (uv <= 7) return { text: 'Alto', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400' };
            if (uv <= 10) return { text: 'Muito Alto', bgColor: 'bg-red-500/20', textColor: 'text-red-400' };
            return { text: 'Extremo', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' };
        }

        function getFlagEmoji(countryCode) {
            if (!countryCode) return '🌐';
            const codePoints = countryCode
                .toUpperCase()
                .split('')
                .map(char => 127397 + char.charCodeAt(0));
            return String.fromCodePoint(...codePoints);
        }

        function refreshData() {
            searchRequestId++;
            citySuggestionRequestId++;
            locationRequestId++;
            clearTimeout(autocompleteDebounceTimer);
            fetchWeatherData(currentCityData.lat, currentCityData.lon);
        }

        function showSpinner() {
            document.getElementById('refreshSpinner').classList.add('animate-spin');
        }

        function hideSpinner() {
            document.getElementById('refreshSpinner').classList.remove('animate-spin');
        }

        function showError(msg) {
            const toast = document.getElementById('errorToast');
            document.getElementById('errorMessage').textContent = msg;
            toast.classList.remove('hidden');
        }

        function hideError() {
            document.getElementById('errorToast').classList.add('hidden');
        }
