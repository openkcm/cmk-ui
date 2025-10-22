import Chance from "chance";
const chance = new Chance();
export default () => {
    const generateTags = (count) => {
        return Array.from({ length: count }, () => (
            chance.word({ length: chance.integer({ min: 3, max: 10 }) })
        ));

    };
    const numTags = chance.integer({ min: 0, max: 6 });
    return {
        value: generateTags(numTags),
        count: numTags
    };
}