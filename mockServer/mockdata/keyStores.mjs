import Chance from "chance";
const chance = new Chance();
export default () => {

    const generateKeyStores = () => {
        const response = {
            default: {
                allowManaged: true,
                allowBYOK: true,
                supportedRegions: [
                    "eu10"
                ]
            },
            hyok: {
                allow: true,
                providers: [
                    "AWS"
                ]
            }
        }
        return response;
    };
    return generateKeyStores();
}