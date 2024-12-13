import ComputationalUnit from './computational-unit.js';

export default class Gpu extends ComputationalUnit {

    constructor (id, workstation, memory, processes = [], maxProcesses = 1) {
        super ('gpu', id, workstation, processes, maxProcesses);
        this.memory = memory;
    }
}