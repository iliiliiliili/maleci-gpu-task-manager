import fetch from 'node-fetch';
import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import database from '../database.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runAddTaskTests = async () => {
    // Failure test (example)
    try {
        console.log('Running failure test for /addTask endpoint');
        const response = await fetch('http://127.0.0.1:2604/addTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workstaton: 'local',
                gpus: 1,
                minimalGpuMemory: 10000,
                name: 'gtm_test_train_fail_test',
                script: 'scripts/run.sh train --a=10 --b=1',
                workdingDir: __dirname,
                saveScreen: true,
                logScreen: undefined,
                priorityValue: undefined,
                token: 'invalid' // Invalid input to trigger failure
            })
        });
        const data = await response.json();
        assert.strictEqual(data.error, null); // This should fail
        console.log(chalk.green('Failure test passed unexpectedly!')); // Should not reach this line
    } catch (error) {
        console.error(chalk.red('Failure test correctly failed for /addTask endpoint:', error.message));
    }

    console.log('Running success test for /addTask endpoint');
    try {
        // Success test (example)
        const response = await fetch('http://127.0.0.1:2604/addTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workstaton: 'local',
                gpus: 1,
                minimalGpuMemory: 10000,
                name: 'gtm_test_train_10_1',
                script: 'scripts/run.sh train --a=10 --b=1',
                workdingDir: __dirname,
                saveScreen: true,
                logScreen: undefined,
                priorityValue: undefined,
                token: database.users[0].token
            })
        });
        const data = await response.json();
        assert.strictEqual(data.error, null);
        assert.strictEqual(data.result, 'Task added');
        console.log(chalk.green('Execution result:', data.result));
        console.log(chalk.green('Test passed for /addTask endpoint'));
    } catch (error) {
        console.error(chalk.red('Test failed for /addTask endpoint:', error.message));
    }
};

export default runAddTaskTests;
