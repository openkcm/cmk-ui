import Chance from "chance";
const chance = new Chance();
export default (taskId) => {
    const states = ['REJECTED', 'WAIT_APPROVAL', 'WAIT_CONFIRMATION'];
    const actionTypes = ['UPDATE_STATE', 'UPDATE_PRIMARY_KEY', 'UPDATE_KEY_CONFIGURATION', 'DELETE'];
    const artifactTypes = ['KEY', 'KEY_CONFIGURATION', 'SYSTEM'];
    const generateTasks = (count) => {
        const response = Array.from({ length: count }, () => (
            {
                id: chance.guid(),
                initiatorId: chance.guid(),
                initiatorName: `Task_Initiator_name_${chance.animal()}`,
                state: chance.pickone(states),
                actionType: chance.pickone(actionTypes),
                artifactType: chance.pickone(artifactTypes),
                artifactID: chance.guid(),
                parameters: "param",
                failureReason: "The Key is in use by a System",
                metadata: {
                    createdAt: "2020-09-10T21:02:00",
                    updatedAt: "2020-09-30T21:02:00"
                }
            }
        ));
        return {
            value: response,
            count: response.length
        };
    };

    if (taskId) {
        return {
            id: taskId,
            initiatorId: chance.guid(),
            initiatorName: `Task_Initiator_name_${chance.animal()}`,
            state: chance.pickone(states),
            actionType: chance.pickone(actionTypes),
            artifactType: chance.pickone(artifactTypes),
            artifactID: chance.guid(),
            parameters: "param",
            failureReason: "The Key is in use by a System",
            metadata: {
                createdAt: "2020-09-10T21:02:00",
                updatedAt: "2020-09-30T21:02:00"
            }
        }
    } else {
        return generateTasks(chance.integer({ min: 1, max: 5 }));
    }

}