// TODO implement DEBUG if needed
// import {argv} from 'process';

// const DEBUG = argv [2] === 'debug';

// if (DEBUG) {
//     console.log({DEBUG});
// }

// import debugSettings from './debug-settings.json' assert { type: 'json' };
import commonSettings from './settings.json' assert { type: 'json' };

// TODO implement DEBUG if needed
// const settings = DEBUG ? debugSettings : commonSettings;
const settings = commonSettings;

import net from 'net';
import { processQueue } from './server-core.js';
import { connections } from './server-core.js';
import Gpu from './gpu.js';
import Cpu from './cpu.js';
import ComputationalUnit from './computational-unit.js';

import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import restRoutes from './restApi.js';
import open from 'open';

const app = express();
const port = 2604;

// Serve static files from the React app build directory
const buildPath = path.join(path.resolve(), 'gui/build');
app.use(express.static(buildPath));

app.use(bodyParser.json());

app.use('/api', restRoutes);

// Serve the index.html file for any other routes
app.get('*', (req, res) => {
	console.log(`WEB Server listening on port ${port}`);
	res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
	console.log(`REST API Server listening on port ${port} with /api path`);
	open(`http://localhost:${port}`);
});

const delimiter = '\n\n\n\n';
let workstations = [];

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
	constructor(socket, onReady) {
		this.socket = socket;

		/** @type {State} */
		this.state = 'empty';

		this.onReady = onReady;
		this.doneCallbacks = {};
		this.messageBuffer = '';

		socket.on('data', (data) => this.onData(data));

		socket.write(JSON.stringify({
			command: 'Hello',
		}) + delimiter);
	}

	get address() {
		return this.socket.remoteAddress + ':' + this.socket.remotePort;
	}

	disconnect() {
		this.socket.destroy();
	}

	/**
	 * @param {Buffer} dataString
	 */
	processMessage(dataString) {
		/** @type {Message} */
		const data = JSON.parse(dataString.toString());

		switch (this.state) {
			case 'empty': {
				if (data.command === 'Hello') {
					this.name = data.name || this.address;
					this.state = 'ready';
					this.gpus = data.gpus;
					this.cpus = data.cpus;
					this.onReady(this, data.override);
				} else {
					log('Unknown command: ', data.command);
				}
			} break;
			case 'ready':
				if (data.command === 'TaskFinished') {
					console.log({ cb: this.doneCallbacks, data });
					const onDone = this.doneCallbacks[data.taskId];
					delete this.doneCallbacks[data.taskId];
					if (onDone) {
						onDone(data.result, data.isError);
					}
				} else {
					log('Unknown command: ', data.command);
				}
				break;
			default:
				break;
		}
	}

	/** @param {Buffer} dataBuffer */
	onData(dataBuffer) {
		const dataString = this.messageBuffer + dataBuffer.toString();
		let index = 0;

		while (dataString.includes(delimiter, index)) {
			const endIndex = dataString.indexOf(delimiter, index);
			const message = dataString.substring(index, endIndex);
			this.processMessage(message);
			index = endIndex + delimiter.length;
		}

		if (index < dataString.length) {
			this.messageBuffer = dataString.substring(index);
		} else {
			this.messageBuffer = '';
		}
	}

	/**
	 * @param {Task} task
	 * @param {Array<ComputationalUnit>} resources
	 * @param {Function} onDone
	 */
	sendTask(task, resources, onDone) {
		if (this.state === 'ready') {
			/** @type {Message} */
			const message = {
				command: 'Process',
				task: task.describe(),
				resources: resources.map(
					a => ({
						type: a.type,
						id: a.id,
					})
				)
			};

			this.socket.write(JSON.stringify(message) + delimiter);
			this.doneCallbacks[task.taskId] = onDone;
		} else {
			throw new Error(`'${this.name}' is not ready`);
		}
	}

	log() {
		log(this.address + ` (${this.id}) ` + this.state);
	}
}

/**
 * @type {Dict<Connection>}
 */

const server = net.createServer(socket => {
	/**
	 * @param {Connection} connection
	 * @param {boolean} override
	 */
	const onReady = (connection, override = false) => {
		if (connection.name in connections) {
			if (override) {
				log('Overriding same connection from ' + connection.name);
				const oldConnection = connections[connection.name];
				workstations = workstations.filter(
					a => a.name !== oldConnection.name
				);
				oldConnection.name = undefined;
				oldConnection.disconnect();
				connections[connection.name] = connection;
			} else {
				log('Closing new same connection from ' + connection.name);
				connection.disconnect();
				return;
			}
		} else {
			connections[connection.name] = connection;
			log(connection.name + ' ready');
		}

		workstations.push({
			name: connection.name,
			gpus: {
				shared: connection.gpus.map(
					a => new Gpu(a.id, connection.name, a.memory, [], a.maxProcesses)
				),
				personal: []
			},
			cpus: connection.cpus.map(
				a => new Cpu(a.id, connection.name, [], a.maxProcesses)
			)
		});

		console.log(workstations);
		console.log(workstations.length);

		processQueue();
	};

	const connection = new Connection(socket, onReady);
	const address = connection.address;
	log('New connection: ' + address);

	const close = () => {
		workstations = workstations.filter(
			a => a.name !== connection.name
		);
		console.log(workstations);
		console.log(workstations.length);
		log('Closed ' + address);
	};

	socket.on('close', close);

	socket.on('error', /** @param {{code: string}} error */ error => {
		switch (error.code) {
			case 'ECONNRESET':
				break;
			default:
				log(error.code);
		}
	});
});

server.on('error', console.log);
server.listen(settings.ports.server, '0.0.0.0');
console.log('Task server started at port: ' + settings.ports.server);