const {remove} = require ('./core');

class ComputationalUnit {

    constructor (type, id, workstation, processes = [], maxProcesses = 1) {

        this.type = type;
        this.id = id;
        this.workstation = workstation;
        this.processes = processes;
        this.maxProcesses = maxProcesses;
    }

    isFree () {

        return this.maxProcesses > this.processes.length;
    }
    
    registerProcess (task) {

        if (!this.isFree ()) {

            console.error ('ComputationalUnit is not free when trying to register new process: ');
            console.error (this);
        }

        this.processes.push (task);
    }

    unregisterProcess (task) {

        if (!this.processes.includes (task)) {

            console.error ('ComputationalUnit had no selected process: ');
            console.error (this);
            console.error (task);
        }

        remove (this.processes, task);
    }
}

module.exports = ComputationalUnit;
