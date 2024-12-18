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
            users: generateUsers(chance.integer({ min: 1, max: 6 })),
            userCount: chance.integer({ min: 1, max: 6 }),
            id: chance.guid(),
        }));
        return {
            value: response,
            count: response.length
        };
    };
    return generateGroups(4);
}