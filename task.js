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
import { execSync, spawn } from 'child_process';
const settings = commonSettings;

export default class Task {
    constructor(taskId, user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen = true, logScreen = true, priorityValue = 0) {
        this.taskId = taskId;
        this.user = user;
        this.workstaton = workstaton;
        this.gpus = gpus;
        this.minimalGpuMemory = minimalGpuMemory;
        this.name = name;
        this.script = script;
        this.workdingDir = workdingDir;
        this.saveScreen = saveScreen;
        this.logScreen = logScreen;
        this.priorityValue = priorityValue;
    }

    get priority() {
        return this.priorityValue || 0;
    }

    describe() {
        return {
            taskId: this.taskId,
            user: this.user,
            workstaton: this.workstaton,
            gpus: this.gpus,
            minimalGpuMemory: this.minimalGpuMemory,
            name: this.name,
            script: this.script,
            workdingDir: this.workdingDir,
            saveScreen: this.saveScreen,
            priorityValue: this.priority,
        };
    }

    async execute(visibleDevices) {
        console.log('Execute ', this.taskId);

        return new Promise((resolve) => {
            const uid = parseInt(execSync ('id -u root') + '');

            const args = [
                '-l', this.user, '-c',
                `CUDA_VISIBLE_DEVICES="${visibleDevices}" screen -S ${this.name}`
                + (this.logScreen ? ` -L -Logfile screenlog.${this.taskId}.${this.name}` : '')
                + ` -dm /gtm/run.sh ${this.workdingDir} '${this.script}'`
                + ` ${this.taskId} ${settings.ports.executor} ${this.saveScreen}`
            ];


            const process = spawn('runuser', args, {
                uid,
            });

            console.log(args);

            process.stdout.on('data', (d) => console.log('out: ' + d));
            process.stderr.on('data', (d) => console.log('err: ' + d));
            process.on('close', () => {

                console.log('started: ' + this.name);
                resolve();
            });
        });
    }

    toString() {
        return this.user + '::' + this.workstaton + '::' + this.name + ' #' + this.taskId + ` (${this.gpus} gpus)`;
    }
}
