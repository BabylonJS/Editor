import { networkInterfaces } from 'os';

/**
 * Returns the current Ip of the user
 */
export function getIp (): string {
    const interfaces = networkInterfaces();

    if (interfaces['Wi-Fi']) { // Wi-fi?
        for (const j of interfaces['Wi-Fi']) {
            if (!j.internal && j.family === 'IPv4') {
                return j.address;
            }
        }
    }

    for (const i in interfaces) { // Other?
        for (const j of interfaces[i]) {
            if (!j.internal && j.family === 'IPv4') {
                return j.address;
            }
        }
    }
}