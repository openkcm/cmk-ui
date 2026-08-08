import Chance from "chance";
const chance = new Chance();
export default () => {
    return {
        identifier: chance.guid(),
        givenName: chance.name(),
        familyName: chance.last(),
        email: chance.email(),
        role: chance.pickone(['KEY_ADMINISTRATOR', 'TENANT_ADMINISTRATOR', 'TENANT_AUDITOR']),
    };
}