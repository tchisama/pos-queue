document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const instanceId = urlParams.get('instanceId');
    const instanceIdDisplay = document.getElementById('instance-id-display');
    const addTabButton = document.getElementById('add-tab-button');
    const testTabsContainer = document.getElementById('test-tabs-container');
    const runTestButton = document.getElementById('run-test-button');
    const saveConfigButton = document.getElementById('save-config-button');
    const uploadConfigButton = document.getElementById('upload-config-button');

    let tabCount = 0; // Start from 0 for initial tab creation
    let instanceBacklink = '';

    const createNewTab = (tabData = null) => {
        const newTabIndex = tabCount++;
        const newTabDiv = document.createElement('div');
        newTabDiv.classList.add('mt-3', 'test-tab-table-container');
        newTabDiv.setAttribute('id', `tab-container-${newTabIndex}`);
        newTabDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5>Tab ${newTabIndex + 1}</h5>
                <button class="btn btn-danger btn-sm delete-tab-button"><i class="fas fa-trash"></i> Delete Tab</button>
            </div>
            <table class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th>Variable</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody id="variables-table-body-${newTabIndex}">
                </tbody>
            </table>
        `;
        testTabsContainer.appendChild(newTabDiv);

        const newVariablesContainer = newTabDiv.querySelector(`#variables-table-body-${newTabIndex}`);

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
        const tableRow = document.createElement('tr');
        tableRow.innerHTML = `
            <td><span class="variable-key-display">${variableName}</span></td>
            <td><input type="text" class="form-control variable-value" placeholder="Variable Value" value="${variableValue}"></td>
        `;
        container.appendChild(tableRow);
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
        const tabContainers = document.querySelectorAll('.test-tab-table-container');
        tabContainers.forEach(tabContainer => {
            const variablesTableBody = tabContainer.querySelector('tbody');
            const tabData = {};
            const tableRows = variablesTableBody.querySelectorAll('tr');
            tableRows.forEach(row => {
                const key = row.querySelector('.variable-key-display').textContent;
                const value = row.querySelector('.variable-value').value;
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
            e.target.closest('.test-tab-table-container').remove();
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

    saveConfigButton.addEventListener('click', () => {
        const allTabsData = collectAllTabsData();
        const filename = `test_config_${instanceId || 'default'}.json`;
        const jsonStr = JSON.stringify(allTabsData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Configuration saved!');
    });

    uploadConfigButton.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const uploadedData = JSON.parse(event.target.result);
                    if (Array.isArray(uploadedData)) {
                        // Clear existing tabs
                        testTabsContainer.innerHTML = '';
                        tabCount = 0;

                        // Populate with uploaded data
                        uploadedData.forEach(tabData => {
                            const newTabIndex = tabCount++;
                            const newTabDiv = document.createElement('div');
                            newTabDiv.classList.add('mt-3', 'test-tab-table-container');
                            newTabDiv.setAttribute('id', `tab-container-${newTabIndex}`);
                            newTabDiv.innerHTML = `
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <h5>Tab ${newTabIndex + 1}</h5>
                                    <button class="btn btn-danger btn-sm delete-tab-button"><i class="fas fa-trash"></i> Delete Tab</button>
                                </div>
                                <table class="table table-bordered table-striped">
                                    <thead>
                                        <tr>
                                            <th>Variable</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody id="variables-table-body-${newTabIndex}">
                                    </tbody>
                                </table>
                            `;
                            testTabsContainer.appendChild(newTabDiv);

                            const newVariablesContainer = newTabDiv.querySelector(`#variables-table-body-${newTabIndex}`);
                            for (const key in tabData) {
                                addVariableInput(newVariablesContainer, key, tabData[key]);
                            }
                        });
                        alert('Configuration uploaded successfully!');
                    } else {
                        alert('Invalid JSON format. Expected an array of tab configurations.');
                    }
                } catch (e) {
                    alert('Error parsing JSON file: ' + e.message);
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
    });
});