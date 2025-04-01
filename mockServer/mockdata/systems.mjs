import Chance from "chance";
const chance = new Chance();
export default (systemID, keyConfigurationID) => {
    const states = ['CONNECTED', 'PENDING', 'AWAITING_APPROVAL'];
    const generateSystems = (count, keyConfigurationID) => {
        const response = Array.from({ length: count }, () => (
            {
                id: chance.guid(),
                sid: chance.string({ length: 3, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }),
                keyConfigurationID: keyConfigurationID ? keyConfigurationID : chance.guid(),
                keyConfigurationName: "Key Config XYZ",
                name: `System ${chance.animal()}`,
                region: chance.pickone(['eu-central-1', 'us-east-1', 'us-west-2']),
                systemRole: 'HEC_HANA',
                status: chance.pickone(["CONNECTED", "DISCONNECTED"])
            }
        ));
        return {
            value: response,
            count: response.length
        };
    };
    if (!systemID && keyConfigurationID) {
        return generateSystems(chance.integer({ min: 1, max: 5 }), keyConfigurationID);
    } else if (systemID && !keyConfigurationID) {
        return {
            id: systemID,
            sid: chance.string({ length: 3, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }),
            keyConfigurationID: chance.guid(),
            keyConfigurationName: `Key Config ${chance.state({ full: true })}`,
            name: `System ${chance.animal()}`,
            region: chance.pickone(['eu-central-1', 'us-east-1', 'us-west-2']),
            systemRole: chance.pickone(["SAP Analytics Cloud", "SuccessFactors Learning", "SAP Ariba", "SAP Fieldglass", "SAP Concur"]),
            status: chance.pickone(['CONNECTED, DISCONNECTED']),
            applicationRole: "HEC_HANA"
        }
    } else {
        return generateSystems(chance.integer({ min: 1, max: 5 }));
    }
}