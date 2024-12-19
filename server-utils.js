import fs from 'fs';
import path from 'path';
import net from 'net';

const settingsPath = path.resolve('./settings.json');
export function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                resolve(err);
            }
        });

        server.once('listening', () => {
            server.close();
            resolve(true);
        });

        server.listen(port, '0.0.0.0');
    });
}

export async function findAvailablePort(ports) {
    for (const port of ports) {
        const isAvailable = await checkPort(port);
        if (isAvailable) {
            return port;
        }
    }
    return null;
}

export function updateSettings(newPort) {
    try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        settings.ports.restApi = newPort;

        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
    } catch (err) {
        console.error('Error updating settings.json:', err);
    }
}