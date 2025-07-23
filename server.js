require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const QUEUE_DB_DIR = path.join(__dirname, 'queueDB');

const app = express();
const port = 3000;

const DB_PATH = path.join(__dirname, 'db.json');

let queues = {}; // instanceId -> queue

// Load instances from DB
const readInstances = () => {
    try {
        const data = fs.readFileSync(DB_PATH);
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeInstances = (instances) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(instances, null, 2));
};

app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.USER && password === process.env.PASSWORD) {
        req.session.isAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.send('Logged out successfully.');
    });
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/api/instances', isAuthenticated, (req, res) => {
    const instances = readInstances();
    const instancesWithStatus = instances.map(inst => {
        const queue = queues[inst.id] || [];
        const queueCount = queue.filter(user => user.endTime > Date.now()).length;
        return {
            ...inst,
            status: queueCount > 0 ? 'active' : 'inactive',
            queueCount: queueCount
        };
    });
    res.json(instancesWithStatus);
});

app.post('/api/instances', (req, res) => {
    const instances = readInstances();
    const newInstance = {
        name: req.body.name,
        id: req.body.id,
        duration: parseInt(req.body.duration, 10) * 1000, // convert to ms
        backlink: req.body.backlink,
        title: req.body.title || 'Welcome to the Queue',
        paragraph: req.body.paragraph || 'You are now in the queue. Please wait for your turn.',
    };
    instances.push(newInstance);
    writeInstances(instances);
    res.status(201).json(newInstance);
});

app.put('/api/instances/:id', (req, res) => {
    const instances = readInstances();
    const instanceIndex = instances.findIndex(inst => inst.id === req.params.id);
    if (instanceIndex !== -1) {
        const updatedInstance = {
            ...instances[instanceIndex],
            name: req.body.name,
            id: req.body.id,
            duration: parseInt(req.body.duration, 10) * 1000,
            backlink: req.body.backlink,
            title: req.body.title,
            paragraph: req.body.paragraph,
        };
        instances[instanceIndex] = updatedInstance;
        writeInstances(instances);
        res.json(updatedInstance);
    } else {
        res.status(404).send('Instance not found');
    }
});

app.delete('/api/instances/:id', (req, res) => {
    let instances = readInstances();
    const initialLength = instances.length;
    instances = instances.filter(inst => inst.id !== req.params.id);
    if (instances.length < initialLength) {
        writeInstances(instances);
        res.status(204).send();
    } else {
        res.status(404).send('Instance not found');
    }
});

app.get('/join/:instanceId', (req, res) => {
    const { instanceId } = req.params;
    const instances = readInstances();
    const instance = instances.find(inst => inst.id === instanceId);

    if (!instance) {
        return res.status(404).send('Instance not found');
    }

    let queue = queues[instanceId] || [];
    const now = Date.now();

    // Prune queue
    queue = queue.filter(user => user.endTime > now);

    // Replace query params in backlink
    let redirectUrl = instance.backlink;
    console.log('Original redirect URL:', redirectUrl);
    console.log('Received query params:', req.query);
    for (const key in req.query) {
        console.log(`Replacing placeholder: {${key}} with value: ${req.query[key]}`);
        redirectUrl = redirectUrl.replace(`{${key}}`, req.query[key]);
    }
    console.log('Final redirect URL:', redirectUrl);

    if (queue.length === 0) {
        const endTime = now + instance.duration;
        queue.push({ id: 1, endTime });
        res.json({
            isWaiting: false,
            redirectUrl: redirectUrl,
            queueCount: 1
        });
    } else {
        const lastUser = queue[queue.length - 1];
        const waitTime = (lastUser.endTime - now);
        const newEndTime = lastUser.endTime + instance.duration;
        queue.push({ id: queue.length + 1, endTime: newEndTime });

        res.json({
            isWaiting: true,
            waitTime: Math.max(0, Math.round(waitTime / 1000)),
            redirectUrl: redirectUrl,
            queueCount: queue.length
        });
    }
    queues[instanceId] = queue;
});

app.post('/api/queue-event', (req, res) => {
    const { instanceId, timestamp } = req.body;
    if (!instanceId || !timestamp) {
        return res.status(400).send('Missing instanceId or timestamp');
    }

    const date = moment(timestamp).format('YYYY-MM-DD');
    const filePath = path.join(QUEUE_DB_DIR, `${date}.json`);

    fs.readFile(filePath, (err, data) => {
        let queueEvents = [];
        if (!err) {
            queueEvents = JSON.parse(data);
        }
        queueEvents.push({ instanceId, timestamp });
        fs.writeFile(filePath, JSON.stringify(queueEvents, null, 2), (err) => {
            if (err) {
                console.error('Error writing queue event:', err);
                return res.status(500).send('Error logging queue event');
            }
            res.status(200).send('Queue event logged');
        });
    });
});

app.get('/api/queue-data/:date', (req, res) => {
    const { date } = req.params;
    const filePath = path.join(QUEUE_DB_DIR, `${date}.json`);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json([]); // No data for this date
            }
            console.error('Error reading queue data:', err);
            return res.status(500).send('Error retrieving queue data');
        }
        res.json(JSON.parse(data));
    });
});

app.get('/graph', (req, res) => {
    res.sendFile(path.join(__dirname, 'graph.html'));
});

app.get('/:instanceId', (req, res) => {
    const instances = readInstances();
    if (instances.some(inst => inst.id === req.params.instanceId)) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).send('Not a valid instance or route.');
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Dashboard available at http://localhost:${port}/dashboard`);
});