import Chance from "chance";
const chance = new Chance();
const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
export default (configID) => {
    const generateConfigs = (count) => {
        const response = Array.from({ length: count }, () => ({
            name: `Key Config ${chance.state({ full: true })}`,
            id: chance.guid(),
            description: chance.sentence(),
            adminGroupID: chance.guid(),
            metadata: {
                creatorID: chance.guid(),
                creatorName: chance.name(),
                createdAt: chance.date({ min: old, max: now }),
                updatedAt: chance.date({ min: old, max: now }),
                totalKeys: chance.integer({ min: 1, max: 10 }),
                totalSystems: chance.integer({ min: 1, max: 10 })
            },
            primaryKey: {
                id: chance.guid(),
                name: `Key ${chance.animal()}`,
                description: chance.sentence(),
                enabled: chance.bool(),
                primary: true,
                state: chance.pickone(['ENABLED', 'DISABLED']),
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
        }));
        response.forEach(item => {
            if (chance.bool()) {
                item.metadata.totalKeys = 0;
                delete item.primaryKey;
            }
        });
        return {
            data: response,
            count: response.length
        };
    };
    if (configID) {
        return {
            name: `Key Config ${chance.state({ full: true })}`,
            id: configID,
            description: chance.sentence(),
            adminGroupID: chance.guid(),
            metadata: {
                creatorID: chance.guid(),
                creatorName: chance.name(),
                createdAt: chance.date({ min: old, max: now }),
                updatedAt: chance.date({ min: old, max: now }),
                totalKeys: chance.integer({ min: 1, max: 10 }),
                totalSystems: chance.integer({ min: 1, max: 10 })
            },
            primaryKey: {
                id: chance.guid(),
                name: `Key ${chance.animal()}`,
                description: chance.sentence(),
                enabled: chance.bool(),
                primary: true,
                state: chance.pickone(['ENABLED', 'DISABLED']),
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
        }
    } else {
        return generateConfigs(chance.integer({ min: 1, max: 20 }));
    }
}