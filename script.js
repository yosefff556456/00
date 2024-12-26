document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch and parse the JSON data
        const response = await fetch('tt.json');
        const data = await response.json();
        const taxonomy = data.taxonomy;

        // Cache DOM elements
        const selects = {
            kingdom: document.getElementById('kingdom'),
            phylum: document.getElementById('phylum'),
            class: document.getElementById('class'),
            order: document.getElementById('order'),
            family: document.getElementById('family'),
            genus: document.getElementById('genus')
        };

        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const speciesSection = document.getElementById('speciesSection');
        const speciesGrid = document.getElementById('speciesGrid');

        // Initialize search functionality
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim().toLowerCase();
            
            if (query.length < 2) {
                searchResults.classList.remove('show');
                return;
            }

            searchTimeout = setTimeout(() => {
                const results = searchTaxonomy(query, taxonomy);
                displaySearchResults(results, query);
            }, 300);
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.classList.remove('show');
            }
        });

        function searchTaxonomy(query, taxonomy) {
            const results = [];
            
            taxonomy.forEach(item => {
                const matchScore = calculateMatchScore(query, item);
                if (matchScore > 0) {
                    results.push({ item, score: matchScore });
                }
            });

            return results
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map(result => result.item);
        }

        function calculateMatchScore(query, item) {
            let score = 0;
            const searchFields = [
                item.Species.Arabic,
                item.Species.English,
                ...item.LocalNames.Arabic,
                ...item.LocalNames.English,
                ...(item.LocalNames.Regional?.map(r => r.Name) || [])
            ];

            searchFields.forEach(field => {
                if (field && field.toLowerCase().includes(query)) {
                    score += 1;
                }
            });

            return score;
        }

        function formatLocalNames(localNames) {
            const names = [];
            
            if (localNames.Arabic && localNames.Arabic.length > 0) {
                names.push(`الأسماء العربية: ${localNames.Arabic.join('، ')}`);
            }
            
            if (localNames.English && localNames.English.length > 0) {
                names.push(`English Names: ${localNames.English.join(', ')}`);
            }
            
            if (localNames.Regional && localNames.Regional.length > 0) {
                const regionalNames = localNames.Regional.map(r => 
                    `${r.Name} (${r.Region} - ${r.Language})`
                ).join('، ');
                names.push(`الأسماء الإقليمية: ${regionalNames}`);
            }
            
            return names.join('<br>');
        }

        function displaySearchResults(results, query) {
            if (results.length === 0) {
                searchResults.innerHTML = '<div class="list-group-item">لا توجد نتائج</div>';
            } else {
                searchResults.innerHTML = results.map(item => `
                    <div class="list-group-item list-group-item-action" 
                         data-path='${JSON.stringify([
                             item.Kingdom, item.Phylum, item.Class,
                             item.Order, item.Family, item.Genus
                         ])}'>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold">${highlightText(item.Species.Arabic, query)}</div>
                                <div class="text-muted small">${highlightText(item.Species.English, query)}</div>
                            </div>
                            <small class="text-muted">${item.Kingdom.Arabic}</small>
                        </div>
                    </div>
                `).join('');

                // Add click event to search results
                searchResults.querySelectorAll('.list-group-item-action').forEach(item => {
                    item.addEventListener('click', () => {
                        const path = JSON.parse(item.dataset.path);
                        const species = results.find(s => 
                            s.Kingdom.English === path[0].English &&
                            s.Phylum.English === path[1].English &&
                            s.Class.English === path[2].English &&
                            s.Order.English === path[3].English &&
                            s.Family.English === path[4].English &&
                            s.Genus.English === path[5].English
                        );
                        selectTaxonomyPath(path, species);
                        searchResults.classList.remove('show');
                        searchInput.value = '';
                    });
                });
            }
            searchResults.classList.add('show');
        }

        function highlightText(text, query) {
            if (!text) return '';
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        }

        function selectTaxonomyPath(path, selectedSpecies) {
            // Reset all selects after the changed one
            let found = false;
            Object.entries(selects).forEach(([level, select]) => {
                if (found) {
                    select.innerHTML = '<option value="">اختر...</option>';
                    select.disabled = true;
                }
                found = true;
            });

            // Set values for all selects in the path
            Object.entries(selects).forEach(([level, select], index) => {
                const value = path[index];
                if (value) {
                    // Update options
                    const uniqueOptions = new Set();
                    taxonomy.forEach(item => {
                        if (index === 0 || matchesSelectedPath(item, path, index)) {
                            uniqueOptions.add(JSON.stringify(item[level.charAt(0).toUpperCase() + level.slice(1)]));
                        }
                    });
                    
                    fillSelect(select, Array.from(uniqueOptions).map(o => JSON.parse(o)));
                    select.value = JSON.stringify(value);
                    select.disabled = false;
                }
            });

            // Show species details if a species is selected
            if (selectedSpecies) {
                displaySpeciesDetails(selectedSpecies);
            }
        }

        function matchesSelectedPath(item, path, currentIndex) {
            const levels = ['Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus'];
            for (let i = 0; i < currentIndex; i++) {
                if (item[levels[i]].English !== path[i].English) {
                    return false;
                }
            }
            return true;
        }

        function generateClassificationString(taxonomyItem) {
            const levels = [
                { name: 'المملكة', value: taxonomyItem.Kingdom },
                { name: 'الشعبة', value: taxonomyItem.Phylum },
                { name: 'الصف', value: taxonomyItem.Class },
                { name: 'الرتبة', value: taxonomyItem.Order },
                { name: 'الفصيلة', value: taxonomyItem.Family },
                { name: 'الجنس', value: taxonomyItem.Genus },
                { name: 'النوع', value: taxonomyItem.Species }
            ];

            return levels.map(level => 
                `<div class="classification-item">
                    <span class="level-name">${level.name}:</span>
                    <span class="level-value">
                        ${level.value.Arabic} | ${level.value.English}
                    </span>
                </div>`
            ).join('');
        }

        function createSpeciesCard(species) {
            const card = document.createElement('div');
            card.className = 'species-card';
            card.innerHTML = `
                <div class="species-header">
                    <h2>${species.Species.Arabic}</h2>
                    <h3 class="scientific-name">${species.Species.English}</h3>
                </div>

                <div class="classification">
                    ${generateClassificationString(species)}
                </div>

                <div class="local-names">
                    ${formatLocalNames(species.LocalNames)}
                </div>

                <div class="description">
                    <h4>الوصف</h4>
                    <p class="arabic">${species.Description.Arabic}</p>
                    <p class="english">${species.Description.English}</p>
                </div>

                <div class="habitat">
                    <h4>الموئل</h4>
                    <p class="arabic">${species.Habitat.Arabic}</p>
                    <p class="english">${species.Habitat.English}</p>
                </div>

                ${species.References && species.References.length > 0 ? `
                    <div class="references">
                        <h4>المراجع</h4>
                        <ul>
                            ${species.References.map(ref => `
                                <li>
                                    <a href="${ref.URL}" target="_blank" class="reference-link">
                                        ${ref.Title}
                                        <small>(${ref.Type})</small>
                                    </a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${species.Media?.Images?.length > 0 ? `
                    <div class="media-section">
                        <h4>الصور</h4>
                        <div class="image-gallery">
                            ${species.Media.Images.map(img => `
                                <figure class="media-item">
                                    <img src="${img.URL}" alt="${img.Caption.Arabic}">
                                    <figcaption>
                                        ${img.Caption.Arabic}<br>
                                        ${img.Caption.English}<br>
                                        <small>المصدر: ${img.Credit} (${img.License})</small>
                                    </figcaption>
                                </figure>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${species.Media?.Videos?.length > 0 ? `
                    <div class="media-section">
                        <h4>الفيديوهات</h4>
                        <div class="video-gallery">
                            ${species.Media.Videos.map(video => `
                                <figure class="media-item">
                                    <video src="${video.URL}" controls></video>
                                    <figcaption>
                                        ${video.Caption.Arabic}<br>
                                        ${video.Caption.English}<br>
                                        <small>المصدر: ${video.Credit} (${video.Duration})</small>
                                    </figcaption>
                                </figure>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
            return card;
        }

        function displaySpeciesDetails(species) {
            speciesSection.innerHTML = '';
            const card = createSpeciesCard(species);
            speciesSection.appendChild(card);
            speciesSection.classList.remove('d-none');
            speciesSection.scrollIntoView({ behavior: 'smooth' });
        }

        // Handle taxonomy selection
        Object.entries(selects).forEach(([level, select]) => {
            select.addEventListener('change', () => handleSelection(level));
        });

        async function handleSelection(changedLevel) {
            const levels = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'];
            const currentIndex = levels.indexOf(changedLevel);
            
            // Reset subsequent selections
            for (let i = currentIndex + 1; i < levels.length; i++) {
                const selectElement = selects[levels[i]];
                selectElement.innerHTML = '<option value="">اختر...</option>';
                selectElement.disabled = true;
            }

            // Get current selection path
            const selectedPath = [];
            let allSelected = true;
            for (let i = 0; i <= currentIndex; i++) {
                const level = levels[i];
                const selected = selects[level].value;
                if (selected) {
                    selectedPath.push(JSON.parse(selected));
                } else {
                    allSelected = false;
                    break;
                }
            }

            // Filter species based on selection
            if (allSelected) {
                const filteredSpecies = taxonomy.filter(item => {
                    for (let i = 0; i <= currentIndex; i++) {
                        const level = levels[i].charAt(0).toUpperCase() + levels[i].slice(1);
                        if (item[level].English !== selectedPath[i].English) {
                            return false;
                        }
                    }
                    return true;
                });

                // Update species grid
                speciesGrid.innerHTML = '';
                filteredSpecies.forEach(species => {
                    const card = createSpeciesCard(species);
                    speciesGrid.appendChild(card);
                });

                // Populate next level if available
                if (currentIndex < levels.length - 1) {
                    const nextLevel = levels[currentIndex + 1];
                    const nextLevelKey = nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1);
                    const uniqueOptions = new Set();
                    
                    filteredSpecies.forEach(item => {
                        uniqueOptions.add(JSON.stringify(item[nextLevelKey]));
                    });
                    
                    const nextSelect = selects[nextLevel];
                    fillSelect(nextSelect, Array.from(uniqueOptions).map(o => JSON.parse(o)));
                    nextSelect.disabled = false;
                }
            }
        }

        function fillSelect(select, options) {
            const fragment = document.createDocumentFragment();
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'اختر...';
            fragment.appendChild(defaultOption);

            options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(option);
                opt.textContent = `${option.Arabic} | ${option.English}`;
                fragment.appendChild(opt);
            });

            select.innerHTML = '';
            select.appendChild(fragment);
        }

        // Initialize the first select (Kingdom)
        const uniqueKingdoms = new Set();
        taxonomy.forEach(item => {
            uniqueKingdoms.add(JSON.stringify(item.Kingdom));
        });
        fillSelect(selects.kingdom, Array.from(uniqueKingdoms).map(k => JSON.parse(k)));

    } catch (error) {
        console.error('Error loading taxonomy data:', error);
    }
});
