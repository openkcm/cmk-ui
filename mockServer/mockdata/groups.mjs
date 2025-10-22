import Chance from "chance";
const chance = new Chance();
export default () => {
    const generateGroups = (count) => {
        const response = Array.from({ length: count }, () => ({
            name: chance.pickone(['KMS Admin', 'KMS Admin EU', 'KMS Admin US', 'KMS Auditor']),
            description: chance.sentence(),
            id: chance.guid(),
            role: chance.pickone(['Tenant Administrator', 'Auditor']),
            iamIdentifier: chance.string({ length: 10, pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' })
        }));
        return {
            value: response,
            count: response.length
        };
    };
    return generateGroups(4);
}