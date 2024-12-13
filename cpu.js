import ComputationalUnit from './computational-unit.js';

export default class Cpu extends ComputationalUnit {
    constructor (id, workstation, processes = [], maxProcesses = 10) {
        super ('cpu', id, workstation, processes, maxProcesses);
    }
}
