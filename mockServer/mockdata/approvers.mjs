import Chance from "chance";
const chance = new Chance();
export default (taskId) => {
    const decisions = ['APPROVED', 'REJECTED', 'PENDING'];
    const generateApprovers = (count) => {
        const response = Array.from({ length: count }, () => (
            {
                id: taskId,
                name: `Approver_Name_${chance.animal()}`,
                decision: chance.pickone(decisions),
            }
        ));
        return {
            value: response,
            count: response.length
        };
    };
    return generateApprovers(chance.integer({ min: 1, max: 5 }));

}