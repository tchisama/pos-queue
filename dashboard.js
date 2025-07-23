document.addEventListener('DOMContentLoaded', () => {
    const instanceList = document.getElementById('instance-list');
    const addInstanceForm = document.getElementById('add-instance-form');
    const editInstanceForm = document.getElementById('edit-instance-form');
    const addInstanceModal = new bootstrap.Modal(document.getElementById('addInstanceModal'));
    const editInstanceModal = new bootstrap.Modal(document.getElementById('editInstanceModal'));

    const fetchInstances = () => {
        fetch('/api/instances')
            .then(response => response.json())
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
                            <button class="btn btn-sm btn-danger" onclick="deleteInstance('${inst.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                    instanceList.appendChild(row);
                });
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
        .then(() => {
            addInstanceForm.reset();
            addInstanceModal.hide();
            fetchInstances();
        });
    });

    window.openEditModal = (id) => {
        fetch('/api/instances')
            .then(response => response.json())
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
            });
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
        .then(() => {
            editInstanceModal.hide();
            fetchInstances();
        });
    });

    window.viewGraph = (id) => {
        window.location.href = `/graph?instanceId=${id}`;
    };

    window.deleteInstance = (id) => {
        if (confirm('Are you sure you want to delete this instance?')) {
            fetch(`/api/instances/${id}`, {
                method: 'DELETE',
            })
            .then(() => {
                fetchInstances();
            });
        }
    };

    fetchInstances();

    // Refresh instances every 15 seconds
    setInterval(fetchInstances, 15000);
});
