document.addEventListener('DOMContentLoaded', () => {
    const instanceList = document.getElementById('instance-list');
    const addInstanceForm = document.getElementById('add-instance-form');
    const editInstanceForm = document.getElementById('edit-instance-form');
    const addInstanceModal = new bootstrap.Modal(document.getElementById('addInstanceModal'));
    const editInstanceModal = new bootstrap.Modal(document.getElementById('editInstanceModal'));

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginContainer = document.getElementById('login-container');
    const dashboardContent = document.getElementById('dashboard-content');
    const logoutButton = document.getElementById('logout-button');

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/instances');
            if (response.ok) {
                loginContainer.style.display = 'none';
                dashboardContent.style.display = 'block';
                fetchInstances();
            } else if (response.status === 401) {
                loginContainer.style.display = 'block';
                dashboardContent.style.display = 'none';
            } else {
                console.error('Error checking authentication:', response.statusText);
            }
        } catch (error) {
            console.error('Network error checking authentication:', error);
            loginContainer.style.display = 'block';
            dashboardContent.style.display = 'none';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (data.success) {
                loginError.classList.add('d-none');
                checkAuth();
            } else {
                loginError.textContent = data.message || 'Login failed';
                loginError.classList.remove('d-none');
            }
        } catch (error) {
            loginError.textContent = 'An error occurred during login.';
            loginError.classList.remove('d-none');
            console.error('Login error:', error);
        }
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('/logout', {
                method: 'POST',
            });
            if (response.ok) {
                checkAuth();
            } else {
                console.error('Logout failed:', response.statusText);
            }
        } catch (error) {
            console.error('Network error during logout:', error);
        }
    };

    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', handleLogout);

    const fetchInstances = () => {
        fetch('/api/instances')
            .then(response => {
                if (response.status === 401) {
                    checkAuth(); // Re-check auth if unauthorized
                    return Promise.reject('Unauthorized');
                }
                return response.json();
            })
            .then(instances => {
                instanceList.innerHTML = '';
                instances.forEach(inst => {
                    const row = document.createElement('tr');
                    let statusContent;
                    if (inst.queueCount > 0) {
                        statusContent = `<i class="fas fa-circle text-danger"></i> ${inst.queueCount}`;
                    } else {
                        statusContent = '<i class="fas fa-circle text-success"></i>';
                    }
                    row.innerHTML = `
                        <td>${inst.name || ''}</td>
                        <td>${inst.id}</td>
                        <td>${inst.duration / 1000}s</td>
                        <td>${inst.backlink}</td>
                        <td>${statusContent}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-2" onclick="openEditModal('${inst.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-info me-2" onclick="viewGraph('${inst.id}')"><i class="fas fa-chart-bar"></i></button>
                            <button class="btn btn-sm btn-primary me-2" onclick="openTestPage('${inst.id}')"><i class="fas fa-vial"></i> Test</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteInstance('${inst.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                    instanceList.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error fetching instances:', error);
            });
    };

    addInstanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newInstance = {
            name: document.getElementById('add-instance-name').value,
            id: document.getElementById('add-instance-id').value,
            duration: parseInt(document.getElementById('add-duration').value, 10),
            backlink: document.getElementById('add-backlink').value,
            title: document.getElementById('add-title').value,
            paragraph: document.getElementById('add-paragraph').value,
        };

        fetch('/api/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newInstance),
        })
        .then(response => {
            if (response.status === 401) {
                checkAuth();
                return Promise.reject('Unauthorized');
            }
            return response.json();
        })
        .then(() => {
            addInstanceForm.reset();
            addInstanceModal.hide();
            fetchInstances();
        })
        .catch(error => console.error('Error adding instance:', error));
    });

    window.openEditModal = (id) => {
        fetch('/api/instances')
            .then(response => {
                if (response.status === 401) {
                    checkAuth();
                    return Promise.reject('Unauthorized');
                }
                return response.json();
            })
            .then(instances => {
                const instance = instances.find(inst => inst.id === id);
                if (instance) {
                    document.getElementById('edit-instance-original-id').value = instance.id;
                    document.getElementById('edit-instance-name').value = instance.name || '';
                    document.getElementById('edit-instance-id').value = instance.id;
                    document.getElementById('edit-duration').value = instance.duration / 1000;
                    document.getElementById('edit-backlink').value = instance.backlink;
                    document.getElementById('edit-title').value = instance.title || '';
                    document.getElementById('edit-paragraph').value = instance.paragraph || '';
                    editInstanceModal.show();
                }
            })
            .catch(error => console.error('Error opening edit modal:', error));
    };

    editInstanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const originalId = document.getElementById('edit-instance-original-id').value;
        const updatedInstance = {
            name: document.getElementById('edit-instance-name').value,
            id: document.getElementById('edit-instance-id').value,
            duration: parseInt(document.getElementById('edit-duration').value, 10),
            backlink: document.getElementById('edit-backlink').value,
            title: document.getElementById('edit-title').value,
            paragraph: document.getElementById('edit-paragraph').value,
        };

        fetch(`/api/instances/${originalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedInstance),
        })
        .then(response => {
            if (response.status === 401) {
                checkAuth();
                return Promise.reject('Unauthorized');
            }
            return response.json();
        })
        .then(() => {
            editInstanceModal.hide();
            fetchInstances();
        })
        .catch(error => console.error('Error editing instance:', error));
    });

    window.viewGraph = (id) => {
        window.location.href = `/graph?instanceId=${id}`;
    };

    window.openTestPage = (id) => {
        window.location.href = `/test.html?instanceId=${id}`;
    };

    window.deleteInstance = (id) => {
        if (confirm('Are you sure you want to delete this instance?')) {
            fetch(`/api/instances/${id}`, {
                method: 'DELETE',
            })
            .then(response => {
                if (response.status === 401) {
                    checkAuth();
                    return Promise.reject('Unauthorized');
                }
                return response.text(); // or .json() if your API returns JSON on delete
            })
            .then(() => {
                fetchInstances();
            })
            .catch(error => console.error('Error deleting instance:', error));
        }
    };

    checkAuth(); // Initial check when the page loads

    // Refresh instances every 15 seconds
    setInterval(() => {
        if (dashboardContent.style.display === 'block') {
            fetchInstances();
        }
    }, 15000);
});
