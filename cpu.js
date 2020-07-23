const ComputationalUnit = require ('./computational-unit');

class Cpu extends ComputationalUnit {

    constructor (id, workstation, processes = [], maxProcesses = 10) {

        super ('cpu', id, workstation, processes, maxProcesses);
    }
}

module.exports = Cpu;
