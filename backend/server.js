const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const cors = require("cors");
const dotenv = require('dotenv');
const { addNewOperation, getOperations, clearOperations, getOperationsForUser } = require('./db');
const Bull = require('bull');
dotenv.config();

const {
    REDIS_HOST,
    REDIS_PORT,
    REDIS_USERNAME,
    REDIS_PASSWORD,
} = process.env


const { formatMessage } = require("./utils");


const PORT = process.env.PORT || 5000;
// Serve static files from the public directory
app.use(express.static('public'));

app.use(cors(
    {
        origin: "http://localhost:3000",
    }
));

const users = [];

function addNewUser(id, username, room) {
    const user = { id, username, room };
    users.push(user);
    return user;
}

function getRoomUsers(room) {
    return users.filter(user => user.room === room);
}

const BOT_NAME = 'Holonext Bot';

const SOCKET_EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    MESSAGE: 'message',
    RECONNECT: 'reconnect',
    JOIN_SESSION: 'join-session',
    LEAVE_SESSION: 'leave-session',
    POSITION_CHANGE: 'position-change',
    ROTATION_CHANGE: 'rotation-change',
    SCALING_CHANGE: 'scaling-change',
    SESSION_USERS: 'session-users',
    ADD_MODEL: 'add-model',
    REMOVE_MODEL: 'remove-model',
    SESSION_HISTORY: 'session-history',
}


const sessionQueues = {}; // Store sockets for each session
const REDIS_URL = process.env.REDIS_URL || ''



// Create a function to create a Bull queue for a session
function createQueueForSession(sessionId) {
    console.log('createQueueForSession', sessionId);

    try {
        const sessionQueue = new Bull(`session-${sessionId}`, {
            redis: {
                host: REDIS_HOST,
                port: REDIS_PORT,
                password: REDIS_PASSWORD,

            }
        });


        // Listen to queue events
        sessionQueue.on('global:completed', (jobId, result) => {
            console.log(`Job completed with result ${result}`);
        });

        sessionQueue.on('global:failed', (jobId, err) => {
            console.log(`Job ${jobId} failed with error ${err.message}`);
        });

        return sessionQueue;

    } catch (error) {
        console.log('error creating queue', error);
    }
    return null;


}

function processQueueForSession(sessionId) {
    const sessionQueue = sessionQueues[sessionId];

    // Process jobs from the queue
    sessionQueue.process(async (job) => {

        // Add operation to db
        await addNewOperation({
            sessionId,
            operation: {
                event: job.data.event,
                data: job.data.data,
            },
            user: job.data.user
        });

        const socket = io.sockets.sockets.get(job.data.user.id);

        socket.broadcast.to(job.data.user.room).emit(job.data.event, job.data.data);
        socket.broadcast.to(job.data.user.room).emit(SOCKET_EVENTS.MESSAGE, { message: formatMessage(BOT_NAME, `${job.data.user.username} has changed ${job.data.event} `) });

        // Do some heavy work
        return job.data;
    });
}






// Handle socket connections
io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    console.log('a user connected');

    socket.on(SOCKET_EVENTS.JOIN_SESSION, ({ user: usr, sessionId }) => {

        console.log('user joined', usr);
        const user = addNewUser(socket.id, usr.username, sessionId)


        // Join a room for a specific session 
        socket.join(sessionId);
        // Retrieve session history from the database
        try {
            const history = getOperations(sessionId);

            // Send message to user itself
            socket.emit(SOCKET_EVENTS.MESSAGE, { message: formatMessage(BOT_NAME, 'Welcome to holonext 3D collaborator!') });

            console.log('session history sending', history);
            // Send session history to user
            socket.emit(SOCKET_EVENTS.SESSION_HISTORY, { history });
            console.log('session history sent', history);


            // Send users and room info
            socket.broadcast.to(user.room).emit(SOCKET_EVENTS.SESSION_USERS, {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        } catch (error) {
            console.error('Error retrieving session history:', error);
        }


        // create session queue only if not exists 
        if (!sessionQueues[sessionId]) {
            sessionQueues[sessionId] = createQueueForSession(sessionId, socket);

            processQueueForSession(sessionId, socket);
        }





        // if user add new model to 3D scene send info to all users in room
        socket.on(SOCKET_EVENTS.ADD_MODEL, ({
            modelId,
            spotId
        }) => {
            console.log('add model event', modelId, spotId);

            sessionQueues[sessionId].add({
                event: SOCKET_EVENTS.ADD_MODEL,
                data: { modelId, spotId },
                user: user
            });
        });

        // if user remove model from 3D scene send info to all users in room
        socket.on(SOCKET_EVENTS.REMOVE_MODEL, ({
            spotId
        }) => {
            sessionQueues[sessionId].add({
                event: SOCKET_EVENTS.REMOVE_MODEL,
                data: { spotId },
                user: user
            });
        });

        //send position chnage info to all collebretors
        socket.on(SOCKET_EVENTS.POSITION_CHANGE, ({
            position,
            mesh
        }) => {
            console.log('position change event', position, mesh);
            sessionQueues[sessionId].add({
                event: SOCKET_EVENTS.POSITION_CHANGE,
                data: { position, mesh },
                user: user
            });
        })

        socket.on(SOCKET_EVENTS.ROTATION_CHANGE, ({ rotation, mesh }) => {
            sessionQueues[sessionId].add({
                event: SOCKET_EVENTS.ROTATION_CHANGE,
                data: { rotation, mesh },
                user: user
            });
        });

        socket.on(SOCKET_EVENTS.SCALING_CHANGE, ({ scale, mesh }) => {
            sessionQueues[sessionId].add({
                event: SOCKET_EVENTS.SCALING_CHANGE,
                data: { scale, mesh },
                user: user
            });
        });

        socket.on(SOCKET_EVENTS.LEAVE_SESSION, () => {
            socket.leave(sessionId);
            socket.broadcast.to(user.room).emit(SOCKET_EVENTS.MESSAGE, { message: formatMessage(BOT_NAME, `${user.username} has left the session`) });
        });

        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            console.log('user disconnected');

            socket.broadcast.emit(SOCKET_EVENTS.MESSAGE, { message: formatMessage(BOT_NAME, 'A user has left the session') });
        });
    })
});

// Start the server
http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});