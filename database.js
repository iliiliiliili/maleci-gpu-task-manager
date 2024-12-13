import bcrypt from 'bcrypt';
import { readAsJson, saveAsJson } from './core.js';

const saltRounds = 10;

const database = readAsJson('./database.json') || {};
const updateDatabase = () => saveAsJson('./database.json', database);

const createToken = (user) => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    user.token = token;
    user.dateGenerated = new Date().getTime();
};

// TODO remove second condition when better way to authorize from server is implemented
export const login = async(username, password, keyWord) => {
    let user = undefined;
    for (const knownUser of database.users) {
        if (knownUser.login === username) {
            if ((password === 'null' && knownUser.password === 'null')
            // TODO remove second condition when better way to authorize from server is implemented
            || (password === 'null' && keyWord === 'fromServer')) {
                user = knownUser;
                const passwordHash = await bcrypt.hash(password, saltRounds);
                knownUser.password = passwordHash;
                createToken(user);
                updateDatabase();
                break;
            }

            if (await bcrypt.compare(password, knownUser.password)) {
                user = knownUser;
                createToken(user);
                updateDatabase();
                break;
            }
        }
    }

    if (user === undefined) {
        return {
            isSuccess: false,
            error: 'Unknown username or password'
        };
    } else {
        return {
            isSuccess: true,
            accessLevel: user.accessLevel,
            token: user.token,
        };
    }
};

export const checkToken = async (token) => {
    let user = undefined;
    for (const knownUser of database.users) {
        if (knownUser.token === token) {
            user = knownUser;
            break;
        }
    }

    if (user === undefined) {
        return {
            success: false,
            error: 'Unknown token'
        };
    } else {
        return {
            success: true,
            accessLevel: user.accessLevel,
            username: user,
        };
    }
}

export const getAccessLevel = (username) => {
    const user = database.users.find (a => a.login === username);

    if (user === undefined) {
        return 'Unknown username';
    } else {
        return user.accessLevel;
    }
};

export const setPassword = async (username, password) => (
    bcrypt.hash(password, saltRounds).then(hash => {
        const user = database.users.find(a => a.login === username);

        if (user === undefined) {
            return 'Unknown username';
        } else {
            console.log('SUCCES')
            console.log(password)
            console.log(hash)

            user.password = hash;
            updateDatabase();

            return true;
        }
    })
);

export const setAccessLevel = (username, newAccessLevel) => {
    const user = database.users.find(a => a.login === username);

    if (user === undefined) {

        return 'Unknown username';
    } else {

        user.accessLevel = newAccessLevel;
        updateDatabase();

        return true;
    }
};

export const createUser = async (username, password, accessLevel = 1) => (
    bcrypt.hash(password, saltRounds).then(hash => {
        if (password === 'null') {
            hash = 'null';
        }
        
        const user = database.users.find(a => a.login === username);

        if (user === undefined) {

            database.users.push({
                login: username,
                password: hash,
                accessLevel,
            });

            updateDatabase();

            return true;
        } else {
            return `This user already exists (${username})`;
        }
    })
);

export const deleteUser = (username) => {
    const user = database.users.find(a => a.login === username);

    if (user === undefined) {
        return 'Unknown username';
    } else {
        database.users = database.users.filter(a => a.login !== username);
        updateDatabase();

        return true;
    }
};

export default database;
