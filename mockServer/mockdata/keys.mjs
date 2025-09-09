import Chance from "chance";
const chance = new Chance();
const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
export default (keyID) => {
    const states = ['ENABLED', 'DISABLED', 'PENDING_DELETION', 'PENDING_IMPORT', 'DELETED', 'UNKNOWN'];
    const keyTypes = ['SYSTEM_MANAGED', 'HYOK'];
    const date1 = chance.date({ min: old, max: now }).toISOString();
    const date2 = chance.date({ min: old, max: now }).toISOString();
    const generateKeys = (count) => {
        const response = Array.from({ length: count }, () => (
            {
                name: `Key ${chance.animal()}`,
                type: chance.pickone(keyTypes),
                description: chance.sentence(),
                enabled: false,
                id: chance.guid(),
                isPrimary: chance.bool(),
                state: chance.pickone(states),
                customerHeld: chance.bool(),
                nativeId: chance.guid(),
                algorithm: chance.pickone(['AES256', 'RSA3072', 'RSA4096']),
                provider: chance.pickone(['AWS', 'SAP']),
                region: chance.pickone(['eu-central-1', 'us-east-1', 'us-west-2']),
                metadata: {
                    createdBy: chance.name(),
                    createdAt: date1.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                    updatedBy: chance.name(),
                    updatedAt: date2.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                    imported: chance.bool(),
                    totalVersions: chance.integer({ min: 1, max: 10 }),
                    primaryVersion: chance.integer({ min: 1, max: 10 }),
                }
            }
        ));
        return {
            value: response,
            count: response.length
        };
    };
    if (keyID) {
        return {
            name: `Key ${chance.animal()}`,
            type: chance.pickone(keyTypes),
            description: chance.sentence(),
            enabled: chance.bool(),
            id: keyID,
            isPrimary: chance.bool(),
            state: chance.pickone(states),
            customerHeld: chance.bool(),
            nativeId: chance.guid(),
            algorithm: chance.pickone(['AES256', 'RSA3072', 'RSA4096']),
            provider: chance.pickone(['AWS', 'SAP']),
            region: chance.pickone(['eu-central-1', 'us-east-1', 'us-west-2']),
            metadata: {
                createdBy: chance.name(),
                createdAt: date1.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                updatedBy: chance.name(),
                updatedAt: date2.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                imported: chance.bool(),
                totalVersions: chance.integer({ min: 1, max: 10 }),
                primaryVersion: chance.integer({ min: 1, max: 10 }),
            }
        }
    } else {
        const keys = generateKeys(chance.integer({ min: 2, max: 15 }));
        const enabledKeyIndex = chance.integer({ min: 0, max: keys.value.length - 1 });
        keys.value.forEach((key, index) => {
            key.enabled = index === enabledKeyIndex;
            key.isPrimary = index === enabledKeyIndex;
        });
        return keys;
    }
}