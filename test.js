document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const instanceId = urlParams.get('instanceId');
    const instanceIdDisplay = document.getElementById('instance-id-display');
    const addTabButton = document.getElementById('add-tab-button');
    const testTabsContainer = document.getElementById('test-tabs-container');
    const runTestButton = document.getElementById('run-test-button');

    let tabCount = 0; // Start from 0 for initial tab creation
    let instanceBacklink = '';

    const createNewTab = (tabData = null) => {
        const newTabIndex = tabCount++;
        const newTabCard = document.createElement('div');
        newTabCard.classList.add('card', 'mt-3', 'test-tab-card');
        newTabCard.setAttribute('id', `tab-card-${newTabIndex}`);
        newTabCard.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Tab ${newTabIndex + 1}</span>
                <button class="btn btn-danger btn-sm delete-tab-button"><i class="fas fa-trash"></i> Delete Tab</button>
            </div>
            <div class="card-body" id="variables-${newTabIndex}">
            </div>
        `;
        testTabsContainer.appendChild(newTabCard);

        const newVariablesContainer = newTabCard.querySelector('.card-body');

        populateInitialVariables(newVariablesContainer);
    };

    if (instanceId) {
        instanceIdDisplay.textContent = instanceId;
        fetch(`/api/instances/${instanceId}`)
            .then(response => response.json())
            .then(instance => {
                instanceBacklink = instance.backlink;
                createNewTab(); // Create a fresh tab
            })
            .catch(error => console.error('Error fetching instance details:', error));
    }

    const extractVariablesFromBacklink = (backlink) => {
        const regex = /\{([^}]+)\}/g;
        const matches = [...backlink.matchAll(regex)];
        return matches.map(match => match[1]);
    };

    const addVariableInput = (container, variableName = '', variableValue = '') => {
        const inputGroup = document.createElement('div');
        inputGroup.classList.add('input-group', 'mb-3');
        inputGroup.innerHTML = `
            <span class="input-group-text variable-key-display">${variableName}</span>
            <input type="text" class="form-control variable-value" placeholder="Variable Value" value="${variableValue}">
        `;
        container.appendChild(inputGroup);
    };

    const populateInitialVariables = (container) => {
        const variables = extractVariablesFromBacklink(instanceBacklink);
        container.innerHTML = ''; // Clear existing placeholder
        variables.forEach(variable => {
            addVariableInput(container, variable);
        });
    };

    const collectAllTabsData = () => {
        const allTabsData = [];
        const tabCards = document.querySelectorAll('.test-tab-card');
        tabCards.forEach(tabCard => {
            const variablesContainer = tabCard.querySelector('.card-body');
            const tabData = {};
            const inputGroups = variablesContainer.querySelectorAll('.input-group');
            inputGroups.forEach(group => {
                const key = group.querySelector('.variable-key-display').textContent;
                const value = group.querySelector('.variable-value').value;
                if (key) {
                    tabData[key] = value;
                }
            });
            allTabsData.push(tabData);
        });
        return allTabsData;
    };

    testTabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-tab-button')) {
            e.target.closest('.test-tab-card').remove();
        }
    });

    addTabButton.addEventListener('click', () => {
        createNewTab();
    });

    runTestButton.addEventListener('click', () => {
        const allTabsData = collectAllTabsData();
        console.log('Running test with data:', allTabsData);

        allTabsData.forEach((data, index) => {
            const queryString = Object.entries(data)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            const url = `/${instanceId}?${queryString}`;
            window.open(url, `_blank_tab_${index}`);
        });
    });
});