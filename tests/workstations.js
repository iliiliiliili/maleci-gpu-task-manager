import fetch from 'node-fetch';
import assert from 'assert';
import chalk from 'chalk';

const runWorkstationsTests = async () => {
    // Failure test (sending unexpected body data)
    try {
        console.log('Running failure test for /workstations endpoint (unexpected data)');
        const response = await fetch('http://127.0.0.1:2604/api/workstations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invalidKey: 'invalidData' // Unexpected data
            })
        });

        const data = await response.json();
        assert.strictEqual(data.error, null); // This should fail, expecting an error
        console.log(chalk.green('Failure test passed unexpectedly!')); // Should not reach this line
    } catch (error) {
        console.error(chalk.red('Failure test correctly failed for /workstations endpoint:', error.message));
    }

    // Success test
    try {
        console.log('Running success test for /workstations endpoint');
        const response = await fetch('http://127.0.0.1:2604/api/workstations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) // Sending an empty body
        });

        const data = await response.json();

        if (data.error) {
            console.error(chalk.red('Error executing code:', data.error));
        } else {
            console.log(chalk.green('Execution result:', data.result));
            console.log(chalk.green('Test passed for /workstations endpoint'));
        }
    } catch (error) {
        console.error(chalk.red('Request failed:', error));
    }
};

// Export the test function
export default runWorkstationsTests;
