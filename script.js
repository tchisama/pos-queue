document.addEventListener('DOMContentLoaded', () => {
    const countdownElement = document.getElementById('countdown');
    const queueCountElement = document.getElementById('queue-count');
    const messageElement = document.getElementById('message');
    const customTitleElement = document.getElementById('custom-title');
    const customParagraphElement = document.getElementById('custom-paragraph');
    const spinnerElement = document.getElementById('spinner');

    const instanceId = window.location.pathname.split('/').pop();
    const queryString = window.location.search;

    // Fetch instance details to get custom title and paragraph
    fetch(`/api/instances`)
        .then(response => response.json())
        .then(instances => {
            const instance = instances.find(inst => inst.id === instanceId);
            if (instance) {
                customTitleElement.textContent = instance.title || 'Welcome to the Queue';
                customParagraphElement.textContent = instance.paragraph || 'You are now in the queue. Please wait for your turn.';
            }

            // Join the queue with the extracted POS ID
            fetch(`/join/${instanceId}${queryString}`)
                .then(response => response.json())
                .then(data => {
                    spinnerElement.style.display = 'none'; // Hide spinner
                    // Log the queue event
                    fetch('/api/queue-event', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ instanceId, timestamp: Date.now() }),
                    }).then(response => {
                        if (!response.ok) {
                            console.error('Failed to log queue event');
                        }
                    }).catch(error => {
                        console.error('Error logging queue event:', error);
                    });

                    if (!data.isWaiting) {
                        // If not waiting, redirect immediately
                        window.location.href = data.redirectUrl;
                    } else {
                        // If waiting, start the countdown
                        let countdown = data.waitTime;
                        
                        // Update the UI with queue information
                        queueCountElement.textContent = data.queueCount - 1;
                        countdownElement.textContent = countdown;
                        messageElement.style.display = 'block';

                        // Start the countdown timer
                        const interval = setInterval(() => {
                            countdown--;
                            countdownElement.textContent = countdown;
                            if (countdown <= 0) {
                                clearInterval(interval);
                                window.location.href = data.redirectUrl;
                            }
                        }, 1000);
                    }
                })
                .catch(error => {
                    console.error('Error joining queue:', error);
                    spinnerElement.style.display = 'none'; // Hide spinner on error
                    messageElement.textContent = 'Could not connect to the queue. Please try again later.';
                    messageElement.style.display = 'block';
                });
        })
        .catch(error => {
            console.error('Error fetching instance details:', error);
            spinnerElement.style.display = 'none'; // Hide spinner on error
            customTitleElement.textContent = 'Error';
            customParagraphElement.textContent = 'Could not load instance details.';
        });
});
