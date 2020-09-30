const {argv} = require ('process');

const DEBUG = argv [2] === 'debug';

if (DEBUG) {

    console.log ({DEBUG});
}

const settings = require (DEBUG ? './debug-settings.json' : './settings.json');

const net = require ('net');
const Task = require ('./task');

/** @type {'empty' | 'ready'} */
let state = 'empty';

let messageBuffer = '';
const delimiter = '\n\n\n\n';

/**
 * @typedef {object} Message
 *
 * @property {'Hello' | 'TaskFinished' | 'Process'} command
 * @property {Array} [gpus]
 * @property {Array} [cpus]
 * @property {string} [name]
 * @property {boolean} [override]
 * @property {number} [taskId]
 * @property {Task} [task]
 * @property {Array} [resources]
 * @property {any} [result]
 * @property {boolean} [isError]
 */


let isClientConnected = false;
let unsentMessagesQueue = [];

const client = new net.Socket ();

client.on ('connect', () => {

    isClientConnected = true;
    console.log ('Connected to: ' + settings.ips.server + ':' + settings.ports.server);
});

const connectClient = () => client.connect (settings.ports.server, settings.ips.server);

client.on ('close', () => {

    isClientConnected = false;
    state = 'empty';
    setTimeout (connectClient, 5000);

    console.log ('Connection to server closed');
});


client.on ('error', (err) => {

    console.log (err);
});

connectClient ();


const processMessage = (dataString) => {

    /** @type {Message}  */
    const data = JSON.parse (dataString.toString ());

    console.log (data.command);

    switch (state) {

        case 'empty':
            if (data.command === 'Hello') {

                state = 'ready';
                client.write (JSON.stringify ({
                    command: 'Hello',
                    name: settings.name,
                    gpus: settings.gpus,
                    cpus: settings.cpus,
                    override: settings.overrideNewConnectionsFromSameWorkstation,
                }) + delimiter);

                unsentMessagesQueue.forEach (m => m ());
                unsentMessagesQueue = [];
            }
            break;

        case 'ready': {
            if (data.command === 'Process') {

                console.log (data.task.taskId);

                const resources = data.resources;
                const gpus = resources.filter (a => a.type === 'gpu').map (a => a.id);
                
                gpus.sort ();

                const visibleDevices = gpus.join (',');
                

                console.log ({visibleDevices});

                const task = new Task (
                    data.task.taskId,
                    data.task.user,
                    data.task.workstaton,
                    data.task.gpus,
                    data.task.minimalGpuMemory,
                    data.task.name,
                    data.task.script,
                    data.task.workdingDir,
                    data.task.saveScreen,
                );

                // const onDone = (result, isError) => {
                    
                //     console.log ('Done', {tid: task.taskId, result, isError});
                    
                //     client.write (JSON.stringify ({
                //         command: 'TaskFinished',
                //         taskId: task.taskId,
                //         result,
                //         isError,
                //     }) + delimiter);
                // };

                if (DEBUG) {

                    setTimeout (() => {

                        const message = () => {

                            client.write (JSON.stringify ({
                                command: 'TaskFinished',
                                taskId: task.taskId,
                            }) + delimiter);
                        };

                        console.log ({
                            isClientConnected,
                            unsentMessagesQueue,
                        });
                
                        if (isClientConnected) {
                
                            message ();
                        
                        } else {
                
                            unsentMessagesQueue.push (message);
                        }
                    }, 4000);
                } else {
                
                    task.execute (visibleDevices);
                }
                // .then (result => onDone (result, false))
                // .catch (result => onDone (result, true));
            }
            break;
        }
        default:
            console.error ('Unknown state: ' + state);
    }
};


client.on ('data', (dataBuffer) => {

    const dataString = messageBuffer + dataBuffer.toString ();
    let index = 0;

    while (dataString.includes (delimiter, index)) {

        const endIndex = dataString.indexOf (delimiter, index);
        const message = dataString.substring (index, endIndex);

        processMessage (message);

        index = endIndex + delimiter.length;
    }

    if (index < dataString.length) {

        messageBuffer = dataString.substring (index);
    } else {

        messageBuffer = '';
    }
});

client.on ('close', () => {

    console.log ('Connection closed');
});

const server = net.createServer (socket => {

    socket.on ('data', dataBuffer => {

        const data = JSON.parse (dataBuffer.toString ());

        console.log ('Done', {tid: data.taskId});

        const message = () => {
                    
            client.write (JSON.stringify ({
                command: 'TaskFinished',
                taskId: data.taskId,
            }) + delimiter);
        };

        if (isClientConnected) {

            message ();
        } else {

            unsentMessagesQueue.push (message);
        }
    });

    socket.on ('error', /** @param {{code: string}} error */ error => {
        
        switch (error.code) {
            case 'ECONNRESET':
                break;
            default:
                console.log (error.code);
        }
    });
});

server.listen (settings.ports.executor, '127.0.0.1');
console.log ('Started callback server at port: ' + settings.ports.executor);
