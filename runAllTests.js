import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const testDir = path.resolve('./tests');

const runTestFile = async (filePath) => {
    console.log(chalk.blue(`\n\nRunning test file: ${filePath}`));
    const testModule = await import(filePath);
    await testModule.default();
};

const runAllTests = async () => {
    const testFiles = fs.readdirSync(testDir).filter(file => {
        return file.endsWith('.js');
    });

    for (const file of testFiles) {
        await runTestFile(path.join(testDir, file));
    }
    console.log('All tests completed.');
};

runAllTests().catch(error => {
    console.error('Error running tests:', error);
});
