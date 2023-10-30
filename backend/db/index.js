const operations = {}



async function addNewOperation({ sessionId, operation, user }) {
    if (!operations[sessionId]) {
        operations[sessionId] = []
    }
    operations[sessionId].push({
        operation,
        user
    })

    console.log('operations', operations)
};

function getOperations(sessionId) {
    return operations[sessionId]
}

async function clearOperations(sessionId) {
    operations[sessionId] = []
}

async function getOperationsForUser(sessionId, user) {
    return operations[sessionId].filter(operation => operation.user === user)
}

module.exports = {
    addNewOperation,
    getOperations,
    clearOperations,
    getOperationsForUser
}

