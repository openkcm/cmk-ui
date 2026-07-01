import Chance from "chance";
const chance = new Chance();
const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

const generateNativeID = () => chance.string({ length: 64, pool: 'abcdef0123456789' });

export default (keyID) => {
    const generateSequentialKeyVersions = (count) => {
        const response = Array.from({ length: count }, (_, index) => {
            const createdAt = chance.date({ min: old, max: now }).toISOString();
            const rotatedAt = chance.date({ min: new Date(createdAt), max: now }).toISOString();
            const updatedAt = rotatedAt;
            return {
                id: chance.guid(),
                version: index + 1,
                nativeID: generateNativeID(),
                metadata: {
                    createdAt: createdAt.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                    rotatedAt: rotatedAt.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                    updatedAt: updatedAt.replace(/\.\d{3}Z$/, '').replace('Z', ''),
                },
                state: index === count - 1 ? 'ENABLED' : (chance.bool() ? 'ENABLED' : 'DISABLED'),
                isPrimary: index === count - 1
            };
        });
        return {
            value: response,
            count: response.length
        };
    };
    return generateSequentialKeyVersions(chance.integer({ min: 1, max: 5 }));
}