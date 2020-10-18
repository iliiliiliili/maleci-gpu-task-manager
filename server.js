const {argv} = require ('process');

const DEBUG = argv [2] === 'debug';

if (DEBUG) {

    console.log ({DEBUG});
}

const Task = require ('./task');
const net = require ('net');
const settings = require (DEBUG ? './debug-settings.json' : './settings.json');
const Gpu = require ('./gpu');
const Cpu = require ('./cpu');
const fs = require ('fs');
const {randomElement, shuffleArray, remove} = require ('./core');
// eslint-disable-next-line no-unused-vars
const ComputationalUnit = require ('./computational-unit');
const database = require ('./database');
const repl = require ('repl');


let workstations = [];
let state = {

    queue: [],
    processingTasks: [],
    finishedTasks: [],
    lastTaskId: 0,
};
const delimiter = '\n\n\n\n';
const taskIdLoop = 260526052605;

const stateFileName = DEBUG ? './debug.state.json' : './state.json';


const loadState = () => {

    if (fs.existsSync (stateFileName)) {

        state = JSON.parse (fs.readFileSync (stateFileName));
        state.queue.forEach (a => Object.setPrototypeOf (a, Task.prototype));
        state.processingTasks.forEach (a => Object.setPrototypeOf (a, Task.prototype));
        state.finishedTasks.forEach (a => Object.setPrototypeOf (a, Task.prototype));
    }
};

const saveState = () => {

    fs.writeFileSync (stateFileName, JSON.stringify (state));
};


loadState ();

const nextTaskId = () => {

    state.lastTaskId = (state.lastTaskId + 1) % taskIdLoop;
    return state.lastTaskId;
};

/**
 * @typedef {object} Message
 *
 * @property {'Hello' | 'TaskFinished' | 'Process'} command
 * @property {Array} [gpus]
 * @property {Array} [cpus]
 * @property {string} [name]
 * @property {boolean} [override]
 * @property {number} [taskId]
 * @property {any} [task]
 * @property {Array} [resources]
 * @property {any} [result]
 * @property {boolean} [isError]
 */

const log = console.log;

class Connection {

    /**
     * @typedef {'empty' | 'ready'} State
     */

    /**
     * @param {net.Socket} socket
     */
    constructor (socket, onReady) {

        this.socket = socket;

        /** @type {State} */
        this.state = 'empty';

        this.onReady = onReady;
        this.doneCallbacks = {};
        this.messageBuffer = '';

        socket.on ('data', (data) => this.onData (data));

        socket.write (JSON.stringify ({
            command: 'Hello',
        }) + delimiter);
    }

    get address () {

        return this.socket.remoteAddress + ':' + this.socket.remotePort;
    }

    disconnect () {

        this.socket.destroy ();
    }

    /**
     * @param {Buffer} dataString
     */
    processMessage (dataString) {

        /** @type {Message} */
        const data = JSON.parse (dataString.toString ());

        switch (this.state) {
            case 'empty': {

                if (data.command === 'Hello') {

                    this.name = data.name || this.address;
                    this.state = 'ready';
                    this.gpus = data.gpus;
                    this.cpus = data.cpus;
                    this.onReady (this, data.override);
                } else {

                    log ('Unknown command: ', data.command);
                }
            } break;
            case 'ready':

                if (data.command === 'TaskFinished') {

                    console.log ({cb: this.doneCallbacks, data});

                    const onDone = this.doneCallbacks [data.taskId];
                    delete this.doneCallbacks [data.taskId];

                    if (onDone) {
                    
                        onDone (data.result, data.isError);
                    }
                    
                } else {

                    log ('Unknown command: ', data.command);
                }
                break;
            default:
                break;
        }
    }

    /** @param {Buffer} dataBuffer */
    onData (dataBuffer) {

        const dataString = this.messageBuffer + dataBuffer.toString ();
        let index = 0;
    
        while (dataString.includes (delimiter, index)) {
    
            const endIndex = dataString.indexOf (delimiter, index);
            const message = dataString.substring (index, endIndex);
    
            this.processMessage (message);
    
            index = endIndex + delimiter.length;
        }
    
        if (index < dataString.length) {
    
            this.messageBuffer = dataString.substring (index);
        } else {
    
            this.messageBuffer = '';
        }
    }

    /**
     * @param {Task} task
     * @param {Array<ComputationalUnit>} resources
     * @param {Function} onDone
     */
    sendTask (task, resources, onDone) {

        if (this.state === 'ready') {

            /** @type {Message} */
            const message = {
                command: 'Process',
                task: task.describe (),
                resources: resources.map (
                    a => ({
                        type: a.type,
                        id: a.id,
                    })
                )
            };

            this.socket.write (JSON.stringify (message) + delimiter);

            this.doneCallbacks [task.taskId] = onDone;
        } else {

            throw new Error (`'${this.name}' is not ready`);
        }
    }

    log () {

        log (this.address + ` (${this.id}) ` + this.state);
    }
}

/**
 * @type {Dict<Connection>}
 */
const connections = {};

let processQueue = null;

const server = net.createServer (socket => {

    /**
     * @param {Connection} connection
     * @param {boolean} override
     */
    const onReady = (connection, override = false) => {
        
        if (connection.name in connections) {

            if (override) {

                log ('Overriding same connection from ' + connection.name);

                const oldConnection = connections [connection.name];

                workstations = workstations.filter (
                    a => a.name !== oldConnection.name
                );

                oldConnection.name = undefined;
                oldConnection.disconnect ();

                connections [connection.name] = connection;
            } else {

                log ('Closing new same connection from ' + connection.name);
                connection.disconnect ();
                return;
            }
        } else {

            connections [connection.name] = connection;
            log (connection.name + ' ready');
        }

        workstations.push ({
            name: connection.name,
            gpus: {
                shared: connection.gpus.map (
                    a => new Gpu (a.id, connection.name, a.memory, [], a.maxProcesses)
                ),
                personal: []
            },
            cpus: connection.cpus.map (
                a => new Cpu (a.id, connection.name, [], a.maxProcesses)
            )
        });

        console.log (workstations);
        console.log (workstations.length);

        processQueue ();
    };

    const connection = new Connection (socket, onReady);

    const address = connection.address;

    log ('New connection: ' + address);

    const close = () => {

        workstations = workstations.filter (
            a => a.name !== connection.name
        );

        console.log (workstations);
        console.log (workstations.length);

        log ('Closed ' + address);
    };

    socket.on ('close', close);

    socket.on ('error', /** @param {{code: string}} error */ error => {
        
        switch (error.code) {
            case 'ECONNRESET':
                break;
            default:
                log (error.code);
        }
    });
});

server.on ('error', console.log);

server.listen (settings.ports.server, '0.0.0.0');
console.log ('Started server at port: ' + settings.ports.server);

/**
 * @param {Task} task
 * @returns {null | [ComputationalUnit]}
 */
const allocateResources = (task) => {

    const selectedWorkstations = task.workstaton === 'any' ?
        workstations : workstations.filter (a => task.workstaton.includes (a.name));

    if (task.gpus <= 0) {

        const freeCpus = [].concat (
            ...selectedWorkstations.map (a => a.cpus.filter (a => a.isFree ()))
        );

        if (freeCpus.length <= 0) {

            return null;
        } else {

            return [randomElement (freeCpus)];
        }
    } else {

        const freeGpus = [].concat (
            ...selectedWorkstations.map (a => a.gpus.shared.filter (
                a => a.isFree () && a.memory >= task.minimalGpuMemory
            ))
        );

        if (freeGpus.length < task.gpus) {

            return null;
        } else {

            shuffleArray (freeGpus);

            return freeGpus.slice (0, task.gpus);
        }
    }
};

processQueue = () => {

    state.queue.sort ((a, b) => b.priority - a.priority);

    for (let i = 0; i < state.queue.length; i ++) {

        const task = state.queue [i];
        const resources = allocateResources (task);

        if (resources === null) {

            continue;
        } else {

            console.log (task.taskId);

            state.queue.splice (i, 1);
            i --;

            resources.forEach (a => a.registerProcess (task));
            
            const workstatonName = resources[0].workstation;
            const connection = connections [workstatonName];

            state.processingTasks.push (task);

            saveState ();

            // eslint-disable-next-line no-loop-func
            connection.sendTask (task, resources, (result, isError) => {

                remove (state.processingTasks, task);
                state.finishedTasks.push (task);
                saveState ();

                resources.forEach (a => a.unregisterProcess (task));

                console.log ({result, isError});
                processQueue ();
            });
        }
    }
};

const add = (user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen, logScreen, priorityValue) => {
      
    const task = new Task (
        nextTaskId (),
        user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen, logScreen,
        priorityValue
    );

    state.queue.push (
        task
    );

    console.log (task.toString ());
    processQueue ();

    saveState ();

    return task.toString ();
};

const showQueue = (user = null, log = console.log) => {

    const selectedQueue = user === null ?
        state.queue : state.queue.filter (task => task.user === user);

    const selectedProcessingTasks = user === null ?
        state.processingTasks : state.processingTasks.filter (task => task.user === user);

    const process = queue => queue.map (
        task => task.toString () + (user === null ? '' : ' script: ' + task.script)
    ).join ('\n');

    const text = 'Queue:\n'
        + process (selectedQueue) + '\n\n'
        + 'Processing tasks:\n'
        + process (selectedProcessingTasks) + '\n\n';

    log (text);
};

const showFinishedTasks = (user, log = console.log) => {

    const selectedFinishedTasks = state.finishedTasks.filter (task => task.user === user);

    const process = queue => queue.map (
        task => task.toString () + (user === null ? '' : ' script: ' + task.script)
    ).join ('\n');

    const text = 'Finished tasks:\n'
        + process (selectedFinishedTasks) + '\n\n';

    log (text);
};

const clearFinishedTasks = (user, log = console.log) => {

    state.finishedTasks = state.finishedTasks.filter (task => task.user !== user);

    log ('Cleared');
};

const clearAllTasks = (user, log = console.log) => {

    state.finishedTasks = state.finishedTasks.filter (task => task.user !== user);
    state.queue = state.queue.filter (task => task.user !== user);
    state.processingTasks = state.processingTasks.filter (task => task.user !== user);

    log ('Cleared');
};

const createRepl = (socket) => {

    const prompt = (user = 'no user') => `gtm::nodejs::${user}>`;

    let user = null;
    let accessLevel = 0;
    const current = repl.start (prompt (), socket);
    current.ignoreUndefined = true;

    const replLog = (data) => {

        current.outputStream.write (data + '\n');
        // console.log (data);
        //current.write (data);

        current.prompt ();
    };

    if (DEBUG) {

        current.context.dadd = () => {

            current.context.add ('monster', 0, 0, 'debug', 'whoami', '~', true, true, 1);
        };
    }

    current.context.help = () => {

        replLog (`
login: login (username, password)
logout: logout ()
add task: add (workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen = true, logScreen = true)
show queue: showQueue (self = true)
set password: setPassword (password)
createUser: createUser (username, password, accessLevel = 1)
set access level: setAccessLevel (username, newAccessLevel)
show current workstations: workstations ()
show finished tasks: showFinishedTasks ()
clear finished tasks: clearFinishedTasks ()
repeat task: repeatTask (taskId)
clear all your tasks: clearAllTasks ()
        `);
    };

    const isLoggedIn = () => {
        
        if (user === null) {

            replLog ('Login required (use login("username", "password"))');
            return false;
        } else {

            return true;
        }
    };

    const isGoodAccessLevel = (key) => {

        if (accessLevel >= settings.accessLevels [key]) {

            return true;
        } else {

            replLog (`Access level must be ${settings.accessLevels [key]} or higher (current is ${accessLevel})`);
        }
    };

    current.context.help ();

    current.context.workstations = () => (

        workstations.map (a => ({
            name: a.name,
            'gpus-shared': a.gpus.shared.map (
                gpu => `id: ${gpu.id}, memory: ${gpu.memory}, processes: ${gpu.processes.length}, maxProcesses: ${gpu.maxProcesses}`
            ),
            'gpus-personal': a.gpus.personal.map (
                gpu => `id: ${gpu.id}, memory: ${gpu.memory}, processes: ${gpu.processes.length}, maxProcesses: ${gpu.maxProcesses}`
            ),
            cpus: a.cpus.map (cpu => `id: ${cpu.id}, processes: ${cpu.processes.length}, maxProcesses: ${cpu.maxProcesses}`),
        }))
    );

    current.context.processQueue = processQueue;
    current.context.add = (workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen = true, logScreen = true, priorityValue = 0) => {

        if (isLoggedIn () && isGoodAccessLevel ('addTask')) {

            add (user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen, logScreen, priorityValue);
        }
    };
    current.context.showQueue = (self = true) => {
        
        showQueue (self ? user : null, replLog);
    };

    current.context.showFinishedTasks = () => {

        if (isLoggedIn ()) {
        
            showFinishedTasks (user, replLog);
        }
    };

    current.context.clearFinishedTasks = () => {

        if (isLoggedIn ()) {
        
            clearFinishedTasks (user, replLog);
        }
    };

    current.context.clearAllTasks = () => {

        if (isLoggedIn () && isGoodAccessLevel ('createUser')) {

            clearAllTasks (user, replLog);
        }
    };

    current.context.repeatTask = (taskId) => {


        if (isLoggedIn && isGoodAccessLevel ('addTask')) {

            /** @type {Task} **/
            const task = state.finishedTasks.find (a => a.taskId === taskId && a.user === user);

            if (task) {

                add (
                    task.user, task.workstaton, task.gpus, task.minimalGpuMemory,
                    task.name, task.script, task.workdingDir, task.saveScreen, task.logScreen
                );
            } else {

                replLog (`No finished task with id ${taskId} for user ${user}`);
            }
        }
    };

    current.context.queue = showQueue;

    current.context.login = (username, password) => {

        database.login (username, password)
            .then (result => {

                if (result.success === true) {

                    user = username;
                    accessLevel = result.accessLevel;
                    
                    current.setPrompt (prompt (user));
                    replLog ('Logged in as: ' + user);
                } else {

                    replLog (result.error);
                }
            });
    };

    current.context.logout = () => {

        user = null;
        accessLevel = 0;
        current.setPrompt (prompt ());
        replLog ('Logged out');
    };

    current.context.setPassword = (password) => {

        if (isLoggedIn ()) {

            database.password (user, password)
                .then (result => {

                    if (result === true) {

                        replLog ('Changed password for: ' + user);
                    } else {

                        replLog (result);
                    }
                });
        }
    };

    current.context.setAccessLevel = (username, newAccessLevel) => {
        
        if (isLoggedIn () && isGoodAccessLevel ('setAccessLevel')) {

            const result = database.setAccessLevel (username, newAccessLevel);

            if (result === true) {
    
                replLog ('Updated accessLevel for: ' + username);
            } else {

                replLog (result);
            }
        }
    };
    
    current.context.createUser = (username, password, accessLevel = 1) => {
    
        if (isLoggedIn () && isGoodAccessLevel ('createUser')) {

            database.createUser (username, password, accessLevel)
                .then (result => {

                    if (result === true) {
    
                        replLog ('Created user: ' + username);
                    } else {

                        replLog (result);
                    }
                });
        }
    };

    current.context.deleteUser = (username) => {

        if (isLoggedIn () && isGoodAccessLevel ('createUser')) {

            const result = database.deleteUser (username);

            if (result === true) {

                replLog ('Deleted user: ' + username);
            } else {

                replLog (result);
            }
        }
    };

};

const replServer = net.createServer (socket => {

    console.log ('Remote repl created for:' + socket.remoteAddress);
    createRepl (socket);
});

replServer.listen (settings.ports.repl, '0.0.0.0');

const main = async () => {

    createRepl ();
};

main ();
