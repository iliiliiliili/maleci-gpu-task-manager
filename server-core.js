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
import Task from './task.js';
import fs from 'fs';
import {randomElement, shuffleArray, remove} from './core.js';


export const externalState = { workstations: [] };
export const connections = {};
let state = {
    queue: [],
    processingTasks: [],
    finishedTasks: [],
    lastTaskId: 0,
};
const taskIdLoop = 260526052605;

// TODO implement DEBUG if needed
// const stateFileName = DEBUG ? './debug.state.json' : './state.json';
const stateFileName = './state.json';


export const isGoodAccessLevel = (key, accessLevel) => {
    console.log('ACCESS LEVEL: ' + accessLevel)
    console.log('COMPARED ACCESS LEVEL: ' + settings.accessLevels[key])

    if (accessLevel >= settings.accessLevels[key]) {

        return true;
    } else {

        console.error(`Access level must be ${settings.accessLevels[key]} or higher (current is ${accessLevel})`);
    }
};

const loadState = () => {
    if (fs.existsSync(stateFileName)) {
        state = JSON.parse(fs.readFileSync(stateFileName));
        state.queue.forEach(a => Object.setPrototypeOf(a, Task.prototype));
        state.processingTasks.forEach(a => Object.setPrototypeOf(a, Task.prototype));
        state.finishedTasks.forEach(a => Object.setPrototypeOf(a, Task.prototype));
    }
};

const saveState = () => {
    fs.writeFileSync(stateFileName, JSON.stringify(state));
};

loadState();

const nextTaskId = () => {
    state.lastTaskId = (state.lastTaskId + 1) % taskIdLoop;
    return state.lastTaskId;
};

/**
 * @param {Task} task
 * @returns {null | [ComputationalUnit]}
 */
const allocateResources =(task) => {
    const selectedWorkstations = task.workstaton === 'any' ?
        externalState.workstations : externalState.workstations.filter(a => task.workstaton.includes(a.name));

    if (task.gpus <= 0) {
        const freeCpus =[].concat(
            ...selectedWorkstations.map(a => a.cpus.filter(a => a.isFree()))
        );

        if (freeCpus.length <= 0) {
            return null;
        } else {
            return[randomElement(freeCpus)];
        }
    } else {
        const freeGpus =[].concat(
            ...selectedWorkstations.map(a => a.gpus.shared.filter(
                a => a.isFree() && a.memory >= task.minimalGpuMemory
            ))
        );

        if (freeGpus.length < task.gpus) {
            return null;
        } else {
            shuffleArray(freeGpus);
            return freeGpus.slice(0, task.gpus);
        }
    }
};

export let processQueue = () => {
    state.queue.sort((a, b) => b.priority - a.priority);

    for (let i = 0; i < state.queue.length; i ++) {
        const task = state.queue[i];
        const resources = allocateResources(task);

        if (resources === null) {
            continue;
        } else {
            console.log('TASK ID: ');
            console.log(task.taskId)

            state.queue.splice(i, 1);
            i --;

            resources.forEach(a => a.registerProcess(task));
            
            const workstatonName = resources[0].workstation;
            const connection = connections[workstatonName];

            state.processingTasks.push(task);

            saveState();

            // eslint-disable-next-line no-loop-func
            connection.sendTask(task, resources, (result, isError) => {
                remove(state.processingTasks, task);
                state.finishedTasks.push(task);
                saveState();

                resources.forEach(a => a.unregisterProcess(task));

                console.log({result, isError});
                processQueue();
            });
        }
    }
};

export const addTask = (user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen, logScreen, priorityValue) => {
    const task = new Task(
        nextTaskId(),
        user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen, logScreen,
        priorityValue
    );

    state.queue.push(
        task
    );

    console.log(task.toString());
    processQueue();

    saveState();

    return task.toString();
};

export const showQueue = (user = null, log = console.log) => {
    const selectedQueue = user === null ?
        state.queue : state.queue.filter(task => task.user === user);

    const selectedProcessingTasks = user === null ?
        state.processingTasks : state.processingTasks.filter(task => task.user === user);

    const process = queue => queue.map(
        task => task.toString() + (user === null ? '' : ' script: ' + task.script)
    ).join('\n');

    const text = 'Queue:\n'
        + process(selectedQueue) + '\n\n'
        + 'Processing tasks:\n'
        + process(selectedProcessingTasks) + '\n\n';

    log(text);
};

export const showFinishedTasks = (user, log = console.log) => {
    const selectedFinishedTasks = state.finishedTasks.filter(task => task.user === user);

    const process = queue => queue.map(
        task => task.toString() + (user === null ? '' : ' script: ' + task.script)
    ).join('\n');

    const text = 'Finished tasks:\n'
        + process(selectedFinishedTasks) + '\n\n';

    log(text);
};

export const clearFinishedTasks = (user, log) => {
    state.finishedTasks = state.finishedTasks.filter(task => task.user !== user);

    if (log) log('Finished tasks cleared');
};

export const clearAllTasks = (user, log) => {
    state.finishedTasks = state.finishedTasks.filter(task => task.user !== user);
    state.queue = state.queue.filter(task => task.user !== user);
    state.processingTasks = state.processingTasks.filter(task => task.user !== user);

    if (log) log('All tasks cleared');
};

export default state;