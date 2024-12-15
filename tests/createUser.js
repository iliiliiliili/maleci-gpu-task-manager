import fetch from 'node-fetch';
import assert from 'assert';
import chalk from 'chalk';
import database from '../database.js';

const username = 'farund2008';
const password = 'null';
const accessLevel = 7;

const runCreateUserTests = async () => {
    // Failure test (invalid token)
    try {
        console.log('Running failure test for /createUser endpoint (invalid token)');
        const response = await fetch('http://127.0.0.1:2604/api/createUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetUsername: username,
                password,
                accessLevel: accessLevel,
                token: 'invalid_token' // Invalid token
            })
        });

        const data = await response.json();
        assert.strictEqual(data.error, null); // This should fail, expecting an error
        console.log(chalk.green('Failure test passed unexpectedly!')); // Should not reach this line
    } catch (error) {
        console.error(chalk.red('Failure test correctly failed for /createUser endpoint:', error.message));
    }

    // Success test
    try {
        console.log('Running success test for /createUser endpoint');
        const response = await fetch('http://127.0.0.1:2604/api/createUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetUsername: username,
                password,
                accessLevel: accessLevel,
                token: database.users[0].token
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error(chalk.red('Error executing code:', data.error));
        } else {
            console.log(chalk.green('Execution result:', data.result));
            console.log(chalk.green('Test passed for /createUser endpoint'));
        }
    } catch (error) {
        console.error(chalk.red('Request failed:', error));
    }
};

export default runCreateUserTests;
