const Task = require ('./task');
const net = require ('net');
const settings = require ('./settings.json');
const Gpu = require ('./gpu');
const Cpu = require ('./cpu');
const {randomElement, shuffleArray} = require ('./core');
// eslint-disable-next-line no-unused-vars
const ComputationalUnit = require ('./computational-unit');
const database = require ('./database');
const repl = require ('repl');

let workstations = [];
const delimiter = '\n\n\n\n';
let lastTaskId = 0;
const taskIdLoop = 260526052605;

const nextTaskId = () => {

    lastTaskId = (lastTaskId + 1) % taskIdLoop;
    return lastTaskId;
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

                    onDone (data.result, data.isError);
                    
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

server.listen (settings.ports.server, '0.0.0.0');
console.log ('Started server at port: ' + settings.ports.server);



const queue = [
    // new Task (13, 'io', 'any', 0, 0, 'sleep 5 && pwd', '/home/io'),
    // new Task (14, 'io', 'any', 0, 0, 'sleep 5 && ls && pwd ', '/home/io/Detection/Models/io/variational-nn-pytorch'),
    // new Task (14, 'io', 'any', 0, 0, 'sleep 5 && pwd', '/home/io'),
    // new Task (15, 'io', 'any', 1, 3000, 'sleep 5 && pwd ', '/home/io'),
    // new Task (16, 'io', 'any', 2, 3001, 'sleep 5 && pwd ', '/home/io'),
    // new Task (17, 'io', 'any', 2, 3000, 'sleep 5 && pwd ', '/home/io'),
    // new Task (18, 'io', 'any', 3, 4000, 'sleep 5 && pwd ', '/home/io'),
    // new Task (19, 'io', 'any', 4, 4000, 'sleep 5 && pwd ', '/home/io'),
    // //new Task (20, 'io', 'any', 7, 4000, 'sleep 5 && pwd ', '/home/io'),
    // new Task (21, 'gtm', 'any', 0, 4000, 'sleep 5 && pwd ', '/home/gtm'),
    // new Task (13, 'io', 'root', 0, 'ls -la', '/mnt/c/FILES/Aarhus/maleci-gpu-task-manager'),
    // new Task ('io', 0, 'bash task.sh', '/mnt/c/FILES/Aarhus/maleci-gpu-task-manager'),
    // new Task (16, 'io', 'any', 0, 0, 'sleep 5 && bash -c "source /home/io/miniconda3/etc/profile.d/conda.sh && conda activate vnnpytorch38 && python debug.py"', '/home/io/Detection/Models/io/variational-nn-pytorch'),
    // new Task (17, 'io', 'any', 1, 0, 'sleep 5 && bash -c "source /home/io/miniconda3/etc/profile.d/conda.sh && conda activate vnnpytorch38 && python debug.py"', '/home/io/Detection/Models/io/variational-nn-pytorch'),
    // new Task (18, 'io', 'any', 3, 0, 'sleep 5 && bash -c "source /home/io/miniconda3/etc/profile.d/conda.sh && conda activate vnnpytorch38 && python debug.py"', '/home/io/Detection/Models/io/variational-nn-pytorch'),
    // new Task (19, 'gtm', 'any', 1, 0, 'gmtio1', 'bash ./debug.sh', '/home/io/Detection/Models/io/variational-nn-pytorch'),
    // new Task (20, 'gtm', 'any', 3, 0, 'gmtio3', 'bash ./debug.sh', '/home/io/Detection/Models/io/variational-nn-pytorch'),
    // new Task (21, 'gtm', 'any', 2, 0, 'gmtio2', 'bash ./debug.sh', '/home/io/Detection/Models/io/variational-nn-pytorch'),
    // new Task (22, 'gtm', 'any', 4, 0, 'gmtio4', 'bash ./debug.sh', '/home/io/Detection/Models/io/variational-nn-pytorch'),
];


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

const processQueue = () => {

    for (let i = 0; i < queue.length; i ++) {

        const task = queue [i];
        const resources = allocateResources (task);

        if (resources === null) {

            return;
        } else {

            console.log (task.taskId);

            queue.splice (i, 1);
            i --;

            resources.forEach (a => a.registerProcess (task));
            
            const workstatonName = resources[0].workstation;
            const connection = connections [workstatonName];
            connection.sendTask (task, resources, (result, isError) => {

                resources.forEach (a => a.unregisterProcess (task));

                console.log ({result, isError});
                processQueue ();
            });
        }
    }
};

const add = (user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen) => {
      
    const task = new Task (
        nextTaskId (),
        user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen
    );

    queue.push (
        task
    );

    console.log (task.toString ());
    processQueue ();
};

const showQueue = (user = null) => {

    const selectedQueue = user === null ?
        queue : queue.filter (task => task.user === user);

    console.log (selectedQueue.map (
        task => task.toString () + (user === null ? '' : ' script: ' + task.script)
    ));
};

const createRepl = (socket) => {

    const prompt = (user = 'no user') => `gtm::nodejs::${user}>`;

    let user = null;
    const current = repl.start (prompt (), socket);

    const replLog = (data) => {

        current.outputStream.write (data + '\n');
        // console.log (data);
        //current.write (data);

        current.prompt ();
    };

    current.context.help = () => {

        replLog (`
login: login(username, password)
add task: add(workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen = false)
showQueue: showQueue(self = true)
password: password(password) // changes password for current user
createUser: createUser(username, password)
        `);
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
    current.context.add = (workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen = false) => {

        if (user === null) {

            replLog ('Login required (use login(username, password))');
        } else {

            add (user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen);
        }
    };
    current.context.showQueue = (self = true) => {
        
        if (self) {

            showQueue (user);
        } else {
            showQueue ();
        }
    };
    current.context.queue = showQueue;

    current.context.login = (username, password) => {

        database.login (username, password)
            .then (result => {

                if (result === true) {

                    user = username;
                    
                    current.setPrompt (prompt (user));
                    replLog ('Logged in as: ' + user);
                } else {

                    replLog (result);
                }
            });
    };

    current.context.password = (password) => {

        if (user === null) {

            console.log ('Login required (use login(username, password))');
        } else {

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
    
    current.context.createUser = (username, password) => {
    
        if (user === null) {

            console.log ('Login required (use login(username, password))');
        } else {

            database.createUser (username, password)
                .then (result => {

                    if (result === true) {
    
                        replLog ('Created user: ' + username);
                    } else {

                        replLog (result);
                    }
                });
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
