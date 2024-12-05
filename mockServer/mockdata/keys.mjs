import Chance from "chance";
const chance = new Chance();
const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
export default (keyID) => {
    const states = ['ENABLED', 'DISABLED', 'PENDING_DELETION', 'PENDING_IMPORT', 'DELETED', 'UNKNOWN'];

    const generateKeys = (count) => {
        const response = Array.from({ length: count }, () => (
            {
                name: `Key ${chance.animal()}`,
                description: chance.sentence(),
                enabled: false,
                id: chance.guid(),
                primary: chance.bool(),
                state: chance.pickone(states),
                customerHeld: chance.bool(),
                nativeId: chance.guid(),
                algorithm: chance.pickone(['AES256', 'RSA3072', 'RSA4096']),
                provider: chance.pickone(['AWS', 'SAP']),
                region: chance.pickone(['eu-central-1', 'us-east-1', 'us-west-2']),
                metadata: {
                    createdBy: chance.name(),
                    createdAt: chance.date({ min: old, max: now }),
                    updatedBy: chance.name(),
                    updatedAt: chance.date({ min: old, max: now }),
                    imported: chance.bool(),
                    totalVersions: chance.integer({ min: 1, max: 10 }),
                    primaryVersion: chance.integer({ min: 1, max: 10 }),
                }
            }
        ));
        return {
            data: response,
            count: response.length
        };
    };
    if (keyID) {
        return {
            name: `Key ${chance.animal()}`,
            description: chance.sentence(),
            enabled: chance.bool(),
            id: keyID,
            primary: chance.bool(),
            state: chance.pickone(states),
            customerHeld: chance.bool(),
            nativeId: chance.guid(),
            algorithm: chance.pickone(['AES256', 'RSA3072', 'RSA4096']),
            provider: chance.pickone(['AWS', 'SAP']),
            region: chance.pickone(['eu-central-1', 'us-east-1', 'us-west-2']),
            metadata: {
                createdBy: chance.name(),
                createdAt: chance.date({ min: old, max: now }),
                updatedBy: chance.name(),
                updatedAt: chance.date({ min: old, max: now }),
                imported: chance.bool(),
                totalVersions: chance.integer({ min: 1, max: 10 }),
                primaryVersion: chance.integer({ min: 1, max: 10 }),
            }
        }
    } else {
        const keys = generateKeys(chance.integer({ min: 2, max: 7 }));
        const enabledKeyIndex = chance.integer({ min: 0, max: keys.data.length - 1 });
        keys.data.forEach((key, index) => {
            key.enabled = index === enabledKeyIndex;
            key.primary = index === enabledKeyIndex;
        });
        return keys;
    }
}