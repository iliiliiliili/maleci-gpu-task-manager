import {login, checkToken, getAccessLevel, createUser, setPassword, setAccessLevel, deleteUser, invalidateToken} from './database.js';
import express from 'express';
import {isGoodAccessLevel, addTask, showQueue, showFinishedTasks, clearFinishedTasks, clearAllTasks} from './server-core.js';
import state from './server-core.js';
import { workstations } from './server-core.js';

const router = express.Router();

router.post('/login', (req, res) => {
    // TODO remove keyWord when better way to authorize from server is implemented
    const {username, password, keyWord} = req.body;

    try {
        // TODO remove keyWord when better way to authorize from server is implemented
        login (username, password, keyWord)
        .then(result => {
            console.log('RESULT')
            console.log(result)
            res.json({ result: result.isSuccess, error: result.error, token: result.token });
        });
    }
    catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});


router.post('/logout', async (req, res) => {
    try {
        const { token } = req.body;
        const tokenStatus = await checkToken(token);
        const username = tokenStatus.username.login;
        
        if (tokenStatus.success && isGoodAccessLevel('logout', getAccessLevel(username))) {
            const invalidateTokenStatus = invalidateToken(token);
            if (invalidateTokenStatus.success) {
                res.json({ result: 'Logged out', error: null });
            } else {
                res.status(400).json({ result: null, error: 'Unknown token' });
            }
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/addTask', async (req, res) => {
    console.log('Endpoint /addTask hit');
    try {
        const { workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen, logScreen, priorityValue, token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
            const username = tokenStatus.username.login;
            if (isGoodAccessLevel('addTask', getAccessLevel(username))) {
                addTask(username, workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen, logScreen, priorityValue);
                res.json({ result: 'Task added', error: null });
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/showQueue', async (req, res) => {
    try {
        const { token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
        const username = tokenStatus.username.login;
            if (isGoodAccessLevel('showQueue', getAccessLevel(username))) {
                const outputs = [];
                const log = (data) => {
                    outputs.push(data);
                }
                showQueue(username, log);
                res.json({ result: outputs, error: null });
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/showFinishedTasks', async (req, res) => {
    try {
        const { token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
        const username = tokenStatus.username.login;
            if (isGoodAccessLevel('showFinishedTasks', getAccessLevel(username))) {
                const outputs = [];
                const log = (data) => {
                    outputs.push(data);
                }
                showFinishedTasks(username, log);
                res.json({ result: outputs, error: null });
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/clearFinishedTasks', async (req, res) => {
    try {
        const { token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
        const username = tokenStatus.username.login;
            if (isGoodAccessLevel('clearFinishedTasks', getAccessLevel(username))) {
                clearFinishedTasks(username);
                res.json({ result: 'Finished tasks cleared', error: null });
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/clearAllTasks', async (req, res) => {
    try {
        const { token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
        const username = tokenStatus.username.login;
            if (isGoodAccessLevel('clearAllTasks', getAccessLevel(username))) {
                clearAllTasks(username);
                res.json({ result: 'All tasks cleared', error: null });
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/repeatTask', async (req, res) => {
    try {
        const { taskId, token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
            const username = tokenStatus.username.login;
            console.log('STATE')
            console.log(state)
        
            if (isGoodAccessLevel('repeatTask', getAccessLevel(username))) {
                const task = state.finishedTasks.find (a => a.taskId === taskId && a.user === username);
                console.log('FINISHED TASKS: ' + JSON.stringify(state.finishedTasks))
                if (task) {
                    addTask (
                        task.user, task.workstaton, task.gpus, task.minimalGpuMemory,
                        task.name, task.script, task.workdingDir, task.saveScreen, task.logScreen
                    );
                    res.json({ result: 'Task repeated', error: null });
                } else {
                    res.status(400).json({ result: null, error: `No finished task with id ${taskId} for user ${username}` });
                }
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/setPassword', async (req, res) => {
    try {
        const { password, token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
            const username = tokenStatus.username.login;
            if (isGoodAccessLevel('setPassword', getAccessLevel(username))) {
                setPassword (username, password)
                    .then (result => {
                        if (result === true) {
                            res.json({ result: 'Changed password for: ' + username, error: null });
                        } else {
                            res.status(400).json({ result: null, error: result });
                        }
                    });
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/setAccessLevel', async (req, res) => {
    try {
        const { targetUsername, newAccessLevel, token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
            const username = tokenStatus.username.login;
            if (isGoodAccessLevel('setAccessLevel', getAccessLevel(username))) {
                const result = setAccessLevel (targetUsername, newAccessLevel);
                if (result === true) {
                    res.json({ result: 'Updated accessLevel for: ' + targetUsername, error: null });
                } else {
                    res.status(400).json({ result: null, error: result });
                }
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/createUser', async (req, res) => {
    try {
        const { targetUsername, password, accessLevel, token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
            const username = tokenStatus.username.login;
            if (isGoodAccessLevel('createUser', getAccessLevel(username))) {
                createUser (targetUsername, password, accessLevel)
                    .then (result => {
                        if (result === true) {
                            res.json({ result: 'Created user: ' + targetUsername, error: null });
                        } else {
                            res.status(400).json({ result: null, error: result });
                        }
                    });
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/deleteUser', async (req, res) => {
    try {
        const { targetUsername, token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
            const username = tokenStatus.username.login;
            if (isGoodAccessLevel('deleteUser', getAccessLevel(username))) {
                const result = deleteUser (targetUsername);
                if (result === true) {
                    res.json({ result: 'Deleted user: ' + targetUsername, error: null });
                } else {
                    res.status(400).json({ result: null, error: result });
                }
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

router.post('/workstations', (req, res) => {
    const result = workstations.map (a => ({
        name: a.name,
        'gpus-shared': a.gpus.shared.map (
            gpu => `id: ${gpu.id}, memory: ${gpu.memory}, processes: ${gpu.processes.length}, maxProcesses: ${gpu.maxProcesses}`
        ),
        'gpus-personal': a.gpus.personal.map (
            gpu => `id: ${gpu.id}, memory: ${gpu.memory}, processes: ${gpu.processes.length}, maxProcesses: ${gpu.maxProcesses}`
        ),
        cpus: a.cpus.map (cpu => `id: ${cpu.id}, processes: ${cpu.processes.length}, maxProcesses: ${cpu.maxProcesses}`),
    }));
    console.log(result);
    res.json({result});
});

router.post('/help', async (req, res) => {
    try {
        const { token } = req.body;
        const tokenStatus = await checkToken(token);
        if (tokenStatus.success) {
            const username = tokenStatus.username.login;
            if (isGoodAccessLevel('clearFinishedTasks', getAccessLevel(username))) {
                console.log('HELP')
                res.json({
                    result: `
                        login: login (username, password)
                        logout: logout ()
                        addTask task: addTask (workstaton, gpus, minimalGpuMemory, name, script, workdingDir, saveScreen = true, logScreen = true)
                        show queue: showQueue (self = true)
                        set password: setPassword (password)
                        createUser: createUser (username, password, accessLevel = 1)
                        set access level: setAccessLevel (username, newAccessLevel)
                        show current workstations: workstations ()
                        show finished tasks: showFinishedTasks ()
                        clear finished tasks: clearFinishedTasks ()
                        repeat task: repeatTask (taskId)
                        clear all your tasks: clearAllTasks ()`,
                    error: null
                });
            } else {
                res.status(403).json({ result: null, error: 'Access denied' });
            }
        } else {
            res.status(401).json({ result: null, error: 'Unauthorized' });
        }
    } catch (error) {
        res.status(400).json({ error: error.toString() });
    }
});

export default router;