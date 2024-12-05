import Chance from "chance";
const chance = new Chance();
const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
export default (keyID) => {
    const generateSequentialKeyVersions = (count) => {
        const response = Array.from({ length: count }, (_, index) => (
            {
                version: index + 1,
                metadata: {
                    createdAt: chance.date({ min: old, max: now }),
                    updatedAt: chance.date({ min: old, max: now }),
                },
                status: index === count - 1 ? 'ENABLED' : 'DISABLED',
                isPrimary: index === count - 1
            }
        ));
        return {
            data: response,
            count: response.length
        };
    };
    return generateSequentialKeyVersions(chance.integer({ min: 1, max: 5 }));
}