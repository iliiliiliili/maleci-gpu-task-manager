const {argv} = require ('process');

const DEBUG = argv [2] === 'debug';

if (DEBUG) {

    console.log ({DEBUG});
}

const {execSync, spawn} = require ('child_process');
const settings = require (DEBUG ? './debug-settings.json' : './settings.json');

class Task {

    constructor (taskId, user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen = true, logScreen = true) {
        
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
    }

    describe () {

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
        };
    }

    async execute (visibleDevices) {

        console.log ('Execute ', this.taskId);

        return new Promise ((resolve) => {

            const uid = parseInt (execSync ('id -u root') + '');

            const args = [
                '-l', this.user, '-c',
                `CUDA_VISIBLE_DEVICES="${visibleDevices}" screen -S ${this.name}`
                + (this.logScreen ? ` -L -Logfile screenlog.${this.taskId}.${this.name}` : '')
                + ` -dm /gtm/run.sh ${this.workdingDir} '${this.script}'`
                + ` ${this.taskId} ${settings.ports.executor} ${this.saveScreen}`
            ];


            const process = spawn ('runuser', args, {
                uid,
            });

            console.log (args);

            process.stdout.on ('data', (d) => console.log ('out: ' + d));
            process.stderr.on ('data', (d) => console.log ('err: ' + d));
            process.on ('close', () => {

                console.log ('started: ' + this.name);
                resolve ();
            });
        });
    }

    toString () {
        
        return this.user + '::' + this.workstaton + '::' + this.name + ' #' + this.taskId + ` (${this.gpus} gpus)`;
    }
}

module.exports = Task;
