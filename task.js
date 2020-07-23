const fs = require ('fs');
const {exec, execSync, spawn} = require ('child_process');
const {O_RDWR, O_NOCTTY} = fs.constants;
const fd = fs.openSync ('/dev/tty', O_RDWR + O_NOCTTY);
const settings = require ('./settings.json');

class Task {

    constructor (taskId, user, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen = true) {
        
        this.taskId = taskId;
        this.user = user;
        this.workstaton = workstaton;
        this.gpus = gpus;
        this.minimalGpuMemory = minimalGpuMemory;
        this.name = name;
        this.script = script;
        this.workdingDir = workdingDir;
        this.saveScreen = saveScreen;
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

            const uid = parseInt (execSync (`id -u ${this.user}`) + '');

            const process = spawn ('screen', [
                '-S', this.name, '-dm', './run.sh', this.workdingDir,
                this.script, this.taskId, settings.ports.executor, this.saveScreen
            ], {
                uid,
                env: {
                    'CUDA_VISIBLE_DEVICES': visibleDevices,
                },
            });

            process.on ('close', () => {
            
                console.log ('started: ' + this.name);
                resolve ();
            });
            



            // exec (this.script, {
            //     cwd: this.workdingDir,
            //     uid,
            //     env: {
            //         'CUDA_VISIBLE_DEVICES': visibleDevices,
            //     }
            // }, (err, stdout, stderr) => {

            //     console.log ({err, stdout, stderr});

            //     if (err) {
                    
            //         reject (err);
            //     } else {

            //         console.log ('resolve ', this.taskId);
            //         resolve (stdout);
            //     }
            // });
        });
    }

    toString () {
        
        return this.user + '::' + this.workstaton + '::' + this.name + ' #' + this.taskId + ` (${this.gpus} gpus)`;
    }
}

module.exports = Task;
