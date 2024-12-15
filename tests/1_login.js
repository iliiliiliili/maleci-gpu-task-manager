import fetch from 'node-fetch';
import assert from 'assert';
import chalk from 'chalk';

const username = 'farund2007';
const password = 'null';
// TODO remove second condition when better way to authorize from server is implemented
const keyWord = 'fromServer';

const runLoginTests = async () => {
    // Failure test (example: using invalid credentials)
    try {
        console.log('Running failure test for /login endpoint');
        const response = await fetch('http://127.0.0.1:2604/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: 'invalid_user', password: 'wrong_pass' }) // Invalid credentials
        });

        const data = await response.json();
        assert.strictEqual(data.error, null); // This should fail
        console.log(chalk.green('Failure test passed unexpectedly!')); // Should not reach this line
    } catch (error) {
        console.error(chalk.red('Failure test correctly failed for /login endpoint:', error.message));
    }

    // Success test
    try {
        console.log('Running success test for /login endpoint');
        const response = await fetch('http://127.0.0.1:2604/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // TODO remove second condition when better way to authorize from server is implemented
            body: JSON.stringify({ username, password, keyWord })
        });
        
        const data = await response.json();

        if (data.error) {
            console.error(chalk.red('Error executing code:', data.error));
        } else {
            console.log(chalk.green('Execution result:', data.result));
            console.log(chalk.green('Test passed for /login endpoint'));
        }
    } catch (error) {
        console.error(chalk.red('Request failed:', error));
    }
};

export default runLoginTests;
