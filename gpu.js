const ComputationalUnit = require ('./computational-unit');

class Gpu extends ComputationalUnit {

    constructor (id, workstation, memory, processes = [], maxProcesses = 1) {

        super ('gpu', id, workstation, processes, maxProcesses);

        this.memory = memory;
    }
}

module.exports = Gpu;
