import fetch from 'node-fetch';
import assert from 'assert';
import chalk from 'chalk';
import database from '../database.js';
import fs from 'fs';
import path from 'path';

const settingsPath = path.resolve('./settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const port = settings.ports.restApi;

const username = 'farund2008';

const runDeleteUserTests = async () => {
    // Failure test (invalid token)
    try {
        console.log('Running failure test for /deleteUser endpoint (invalid token)');
        const response = await fetch(`http://127.0.0.1:${port}/deleteUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetUsername: username,
                token: 'invalid_token' // Invalid token
            })
        });

        const data = await response.json();
        assert.strictEqual(data.error, null); // This should fail, expecting an error
        console.log(chalk.green('Failure test passed unexpectedly!')); // Should not reach this line
    } catch (error) {
        console.error(chalk.red('Failure test correctly failed for /deleteUser endpoint:', error.message));
    }

    // Success test
    try {
        console.log('Running success test for /deleteUser endpoint');
        const response = await fetch(`http://127.0.0.1:${port}/deleteUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetUsername: username,
                token: database.users[0].token
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error(chalk.red('Error executing code:', data.error));
        } else {
            console.log(chalk.green('Execution result:', data.result));
            console.log(chalk.green('Test passed for /deleteUser endpoint'));
        }
    } catch (error) {
        console.error(chalk.red('Request failed:', error));
    }
};

// Export the test function
export default runDeleteUserTests;
