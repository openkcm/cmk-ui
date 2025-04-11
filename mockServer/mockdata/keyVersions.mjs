import Chance from "chance";
const chance = new Chance();
const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
export default (keyID) => {
    const date1 = chance.date({ min: old, max: now }).toISOString();
    const date2 = chance.date({ min: old, max: now }).toISOString();
    const generateSequentialKeyVersions = (count) => {
        const response = Array.from({ length: count }, (_, index) => (
            {
                version: index + 1,
                metadata: {
                    createdAt: date1.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                    updatedAt: date2.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                },
                state: index === count - 1 ? 'ENABLED' : 'DISABLED',
                isPrimary: index === count - 1
            }
        ));
        return {
            value: response,
            count: response.length
        };
    };
    return generateSequentialKeyVersions(chance.integer({ min: 1, max: 5 }));
}