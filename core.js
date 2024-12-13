import { inspect } from 'util';
import fs from 'fs';

export const prettyPrint = (obj, useColors = true) => inspect (obj, false, null, useColors);

/**
 * Returns random integer from `minValue` inclusive to
 * `maxValue` exclusive
 * @param {number} minValue
 * @param {number} maxValue
 */
export const randomInt = (minValue, maxValue) => minValue + Math.floor (Math.random () * (maxValue - minValue));

/**
 * Select random element from `values`
 * @template T
 * @param {Array<T>} values
 * @returns {T}
 */
export const randomElement = (values) => {
    const index = randomInt (0, values.length);
    return values [index];
};

export const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i --) {
        const j = Math.floor (Math.random () * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

/**
 * @template T
 * @param {Array<T>} array
 * @param {T} value
 * @returns {boolean} is element has been deleted
 */
export const remove = (array, value) => {
    const index = array.indexOf (value);
    
    if (index > -1) {
        array.splice (index, 1);
        return true;
    }

    return false;
};

export const saveAsJson = (fileName, data) => {
    fs.writeFileSync (fileName, JSON.stringify (data));
};

export const read = (fileName) => fs.readFileSync (fileName, 'utf8');

export const readAsJson = (fileName) => {
    if (fs.existsSync (fileName)) {

        return JSON.parse (read (fileName));
    }

    return null;
};
