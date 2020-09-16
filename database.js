const bcrypt = require ('bcrypt');
const {readAsJson, saveAsJson} = require ('./core');

const saltRounds = 10;

const database = readAsJson ('./database.json') || {};
const save = () => saveAsJson ('./database.json', database);

const login = async (username, password) => {

    let user = undefined;

    for (const knownUser of database.users) {

        if (knownUser.login === username) {

            if (password === 'null' && knownUser.password === 'null') {

                user = knownUser;
                break;
            }

            if (await bcrypt.compare (password, knownUser.password)) {

                user = knownUser;
                break;
            }
        }
    }

    if (user === undefined) {

        return {
            
            success: false,
            error: 'Unknown username or password'
        };
    } else {

        return {

            success: true,
            accessLevel: user.accessLevel,
        };
    }
};

const password = async (username, password) => (

    bcrypt.hash (password, saltRounds).then (hash => {
        
        const user = database.users.find (a => a.login === username);

        if (user === undefined) {

            return 'Unknown username';
        } else {

            user.password = hash;
            save ();

            return true;
        }
    })
);

const setAccessLevel = (username, newAccessLevel) => {

    const user = database.users.find (a => a.login === username);

    if (user === undefined) {

        return 'Unknown username';
    } else {

        user.accessLevel = newAccessLevel;
        save ();

        return true;
    }
};

const createUser = async (username, password, accessLevel = 1) => (

    bcrypt.hash (password, saltRounds).then (hash => {

        if (password === 'null') {

            hash = 'null';
        }
        
        const user = database.users.find (a => a.login === username);

        if (user === undefined) {

            database.users.push ({
                login: username,
                password: hash,
                accessLevel,
            });

            save ();

            return true;
        } else {

            return `This user already exists (${username})`;
        }
    })
);

const deleteUser = (username) => {

    const user = database.users.find (a => a.login === username);

    if (user === undefined) {

        return 'Unknown username';

    } else {

        database.users = database.users.filter (a => a.login !== username);
        save ();

        return true;
    }
};

module.exports = {
    login,
    createUser,
    password,
    setAccessLevel,
    deleteUser,
};
