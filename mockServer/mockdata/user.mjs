import Chance from "chance";
const chance = new Chance();
export default () => ({
    identifier: chance.guid(),
    givenName: chance.name(),
    email: chance.email(),
    role: 'KEY_ADMINISTRATOR'
});