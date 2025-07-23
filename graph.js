document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const instanceId = urlParams.get('instanceId');
    const datePicker = document.getElementById('date-picker');
    const graphTitle = document.getElementById('graph-title');

    if (instanceId) {
        graphTitle.textContent = `Queue Activity for Instance: ${instanceId}`;
    }

    const today = moment().format('YYYY-MM-DD');
    datePicker.value = today;

    let queueChart;

    const fetchDataAndRenderChart = (date) => {
        fetch(`/api/queue-data/${date}`)
            .then(response => response.json())
            .then(data => {
                const filteredData = instanceId ? data.filter(event => event.instanceId === instanceId) : data;

                const hourlyCounts = {};
                filteredData.forEach(event => {
                    const hour = moment(event.timestamp).format('HH');
                    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
                });

                const labels = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
                const counts = labels.map(hour => hourlyCounts[hour] || 0);

                if (queueChart) {
                    queueChart.destroy();
                }

                const ctx = document.getElementById('queueChart').getContext('2d');
                queueChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Queue Events',
                            data: counts,
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Queue Events'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Hour of Day'
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching queue data:', error);
            });
    };

    datePicker.addEventListener('change', (event) => {
        fetchDataAndRenderChart(event.target.value);
    });

    fetchDataAndRenderChart(today);
});