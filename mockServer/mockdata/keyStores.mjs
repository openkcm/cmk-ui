import Chance from "chance";
const chance = new Chance();
const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
export default () => {

    const generateKeyStores = () => {
        const response = {
            default: {
                allowManaged: chance.bool(),
                allowBYOK: chance.bool(),
                supportedRegions: [
                    "string"
                ]
            },
            hyok: {
                allow: chance.bool(),
                providers: [
                    "AWS"
                ]
            }
        }
        return {
            value: response,
        };
    };
    return generateKeyStores();
}