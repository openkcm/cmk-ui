import Chance from "chance";
const chance = new Chance();
export default (systemId, keyConfigurationID) => {
    const states = ['CONNECTED', 'PROCESSING', 'FAILED', 'DISCONNECTED'];
    const generateSystems = (count, keyConfigurationID) => {
        const response = Array.from({ length: count }, () => (
            {
                id: chance.guid(),
                identifier: chance.string({ length: 3, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }),
                keyConfigurationID: chance.guid(),
                keyConfigurationName: `Key Config ${chance.state({ full: true })}`,
                region: chance.pickone(['eu-central-1', 'us-east-1', 'us-west-2']),
                properties: {
                    Role: chance.pickone(["SAP Analytics Cloud", "SuccessFactors Learning", "SAP Ariba", "SAP Fieldglass", "SAP Concur"]),
                    RoleID: chance.string({ length: 3, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }),
                    Name: `System ${chance.animal()}`
                },
                status: chance.pickone(states),
                type: "SYSTEM"
            }
        ));
        return {
            value: response,
            count: response.length
        };
    };
    if (!systemId && keyConfigurationID) {
        return generateSystems(chance.integer({ min: 1, max: 5 }), keyConfigurationID);
    } else if (systemId && !keyConfigurationID) {
        return {
            id: chance.guid(),
            identifier: chance.string({ length: 3, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }),
            keyConfigurationID: chance.guid(),
            keyConfigurationName: `Key Config ${chance.state({ full: true })}`,
            region: chance.pickone(['eu-central-1', 'us-east-1', 'us-west-2']),
            properties: {
                Role: chance.pickone(["SAP Analytics Cloud", "SuccessFactors Learning", "SAP Ariba", "SAP Fieldglass", "SAP Concur"]),
                RoleID: chance.string({ length: 3, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }),
                Name: `System ${chance.animal()}`
            },
            status: chance.pickone(states),
            type: "SYSTEM"
        }
    } else {
        return generateSystems(chance.integer({ min: 1, max: 5 }));
    }
}