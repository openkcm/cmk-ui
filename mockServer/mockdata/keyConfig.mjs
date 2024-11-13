import Chance from "chance";
const chance = new Chance();
export default () => {
    const generateSystems = (count) => {
        return Array.from({ length: count }, () => (
            {
                id: chance.guid(),
                keyConfig: chance.pickone(['Systems Europe', 'Systems US']),
            }
        ));
    };
    const generateKeys = (count) => {
        const states = ['ENABLED', 'DISABLED', 'PENDING_DELETION', 'PENDING_IMPORT', 'DELETED', 'UNKNOWN'];
        return Array.from({ length: count }, () => (
            {
                name: chance.animal(),
                description: chance.sentence(),
                enabled: chance.bool(),
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
                    createdAt: chance.date(),
                    updatedBy: chance.name(),
                    updatedAt: chance.date(),
                    imported: chance.bool(),
                    totalVersions: chance.integer({ min: 1, max: 10 }),
                    primaryVersion: chance.integer({ min: 1, max: 10 }),
                }
            }
        ));
    };
    const generateConfigs = (count) => {
        const response = Array.from({ length: count }, () => ({
            name: chance.state({ full: true }),
            id: chance.guid(),
            keys: generateKeys(chance.integer({ min: 0, max: 3 })),
            systems: generateSystems(chance.integer({ min: 0, max: 3 })),
            createdBy: chance.email(),
            createdOn: chance.date()
        }));
        return {
            data: response,
            count: response.length
        };
    };
    return generateConfigs(chance.integer({ min: 0, max: 20 }));
}