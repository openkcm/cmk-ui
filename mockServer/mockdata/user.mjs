import Chance from "chance";
const chance = new Chance();
export default (test) => {
    const generateUser = (count) => {
        return Array.from({ length: count }, () => (
            {
                id: chance.guid(),
                name: chance.name(),
                email: chance.email(),
                groupName: chance.pickone(['KMS Admin', 'KMS Admin EU', 'KMS Admin US', 'KMS Auditor']),
            }
        ));

    };
    return generateUser(test);
}