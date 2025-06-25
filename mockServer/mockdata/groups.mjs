import Chance from "chance";
const chance = new Chance();
export default () => {
    const generateUsers = (count) => {
        return Array.from({ length: count }, () => (
            {
                id: chance.guid(),
                name: chance.name(),
                email: chance.email(),
                count: count
            }
        ));

    };
    const generateGroups = (count) => {
        const response = Array.from({ length: count }, () => ({
            name: chance.pickone(['KMS Admin', 'KMS Admin EU', 'KMS Admin US', 'KMS Auditor']),
            description: chance.sentence(),
            id: chance.guid(),
            role: chance.pickone(['Tenant Administrator', 'Auditor']),
        }));
        return {
            value: response,
            count: response.length
        };
    };
    return generateGroups(4);
}