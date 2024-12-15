import fetch from 'node-fetch';
import assert from 'assert';
import chalk from 'chalk';
import database from '../database.js';

const runClearFinishedTasksTests = async () => {
    // Failure test (example: using invalid token)
    try {
        console.log('Running failure test for /clearFinishedTasks endpoint');
        const response = await fetch('http://127.0.0.1:2604/api/clearFinishedTasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: 'invalid_token' }) // Invalid token
        });

        const data = await response.json();
        assert.strictEqual(data.error, null); // This should fail, expecting an error
        console.log(chalk.green('Failure test passed unexpectedly!')); // Should not reach this line
    } catch (error) {
        console.error(chalk.red('Failure test correctly failed for /clearFinishedTasks endpoint:', error.message));
    }

    // Success test
    try {
        console.log('Running success test for /clearFinishedTasks endpoint');
        const response = await fetch('http://127.0.0.1:2604/api/clearFinishedTasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: database.users[0].token }) // Use the valid token from token.json
        });

        const data = await response.json();

        if (data.error) {
            console.error(chalk.red('Error executing code:', data.error));
        } else {
            console.log(chalk.green('Execution result:', data.result));
            console.log(chalk.green('Test passed for /clearFinishedTasks endpoint'));
        }
    } catch (error) {
        console.error(chalk.red('Request failed:', error));
    }
};

export default runClearFinishedTasksTests;
