const fs = require ('fs');
const {spawn} = require ('child_process');

const {O_RDWR, O_NOCTTY} = fs.constants;
const fd = fs.openSync ('/dev/tty', O_RDWR + O_NOCTTY);

const cmd = 'screen';
// const args = ['-S', 'gtmio', '-dm', 'bash', '-c', '"echo olala && sleep 10"'];
const args = ['-S', 'gtmio', './task.sh'];
// const cmd = 'echo';

for (let i = 0; i < 4; i++) {

    const proc = spawn (cmd, ['-S', 'gtmio' + i, '-dm', './task.sh', i + ''], {stdio: [fd, fd, fd]});

    proc.on ('close', () => {
    
        console.log ('close' + i);
    });
    
}