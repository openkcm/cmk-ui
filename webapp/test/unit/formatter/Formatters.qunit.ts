import * as Formatters from 'kms/common/Formatters';
import { SubjectDN, AWSAccessDetails } from 'kms/common/Types';
import {
    SystemStatus,
    SystemType,
    TaskStates,
    StateColors,
    GroupRoles,
    KeyStates,
    KeyCreationTypes,
    HYOKProviders,
    WorkflowStatus,
    ArtifactTypes,
    ActionTypes
} from 'kms/common/Enums';

QUnit.module('Formatters Unit Tests');

QUnit.test('The setSystemStatusIcon method with a CONNECTED state', function (assert) {
    const result = Formatters.setSystemStatusIcon(SystemStatus.CONNECTED);
    assert.strictEqual(result, 'sap-icon://sys-enter-2', 'The icon for CONNECTED state is correct');
});
QUnit.test('The setSystemStatusIcon method with a PROCESSING state', function (assert) {
    const result = Formatters.setSystemStatusIcon(SystemStatus.PROCESSING);
    assert.strictEqual(result, 'sap-icon://lateness', 'The icon for PROCESSING state is correct');
});
QUnit.test('The setSystemStatusIcon method with a FAILED state', function (assert) {
    const result = Formatters.setSystemStatusIcon(SystemStatus.FAILED);
    assert.strictEqual(result, 'sap-icon://message-error', 'The icon for FAILED state is correct');
});
QUnit.test('The setSystemStatusIcon method with an unknown state', function (assert) {
    const result = Formatters.setSystemStatusIcon('UNKNOWN' as SystemStatus);
    assert.strictEqual(result, null, 'The icon for an unknown state is empty');
});
QUnit.test('The setSystemStatusIcon method returns workflow icon when underWorkflow is true', function (assert) {
    const result = Formatters.setSystemStatusIcon(SystemStatus.CONNECTED, true);
    assert.strictEqual(result, 'sap-icon://workflow-tasks', 'The icon should be workflow-tasks when underWorkflow is true');
});
QUnit.test('The setSystemStatusIcon method ignores underWorkflow when false', function (assert) {
    const result = Formatters.setSystemStatusIcon(SystemStatus.CONNECTED, false);
    assert.strictEqual(result, 'sap-icon://sys-enter-2', 'The icon should reflect status when underWorkflow is false');
});

QUnit.test('The setSystemStatusColor method with a CONNECTED state', function (assert) {
    const result = Formatters.setSystemStatusColor(SystemStatus.CONNECTED);
    assert.strictEqual(result, 'Indication14', 'The color for CONNECTED state is correct');
});
QUnit.test('The setSystemStatusColor method with a PROCESSING state', function (assert) {
    const result = Formatters.setSystemStatusColor(SystemStatus.PROCESSING);
    assert.strictEqual(result, 'Indication15', 'The color for PROCESSING state is correct');
});
QUnit.test('The setSystemStatusColor method with a FAILED state', function (assert) {
    const result = Formatters.setSystemStatusColor(SystemStatus.FAILED);
    assert.strictEqual(result, 'Indication11', 'The color for FAILED state is correct');
});
QUnit.test('The setSystemStatusColor method with an unknown state', function (assert) {
    const result = Formatters.setSystemStatusColor('UNKNOWN' as SystemStatus);
    assert.strictEqual(result, null, 'The color for an unknown state is empty');
});

QUnit.test('The formatErrorDetails method returns error message for FAILED status', function (assert) {
    const result = Formatters.formatErrorDetails('FAILED', 'Connection timed out');
    assert.strictEqual(result, 'Connection timed out', 'Should return the error message for FAILED status');
});
QUnit.test('The formatErrorDetails method returns fallback for FAILED status with no message', function (assert) {
    const result = Formatters.formatErrorDetails('FAILED', '');
    assert.strictEqual(result, 'errorSystemFailed', 'Should return system-specific fallback text for FAILED status with empty message');
});
QUnit.test('The formatErrorDetails method returns error message for DISCONNECTED status', function (assert) {
    const result = Formatters.formatErrorDetails('DISCONNECTED', 'Host unreachable');
    assert.strictEqual(result, 'Host unreachable', 'Should return the error message for DISCONNECTED status');
});
QUnit.test('The formatErrorDetails method returns empty string for CONNECTED status', function (assert) {
    const result = Formatters.formatErrorDetails('CONNECTED', 'Some error');
    assert.strictEqual(result, '', 'Should return empty string for CONNECTED status');
});
QUnit.test('The formatErrorDetails method returns empty string for PROCESSING status', function (assert) {
    const result = Formatters.formatErrorDetails('PROCESSING', 'Some error');
    assert.strictEqual(result, '', 'Should return empty string for PROCESSING status');
});

QUnit.test('The isErrorStatus method returns true for FAILED status', function (assert) {
    const result = Formatters.isErrorStatus('FAILED');
    assert.strictEqual(result, true, 'FAILED should be an error status');
});
QUnit.test('The isErrorStatus method returns false for CONNECTED status', function (assert) {
    const result = Formatters.isErrorStatus('CONNECTED');
    assert.strictEqual(result, false, 'CONNECTED should not be an error status');
});
QUnit.test('The isErrorStatus method returns false for PROCESSING status', function (assert) {
    const result = Formatters.isErrorStatus('PROCESSING');
    assert.strictEqual(result, false, 'PROCESSING should not be an error status');
});
QUnit.test('The isErrorStatus method returns false for DISCONNECTED status', function (assert) {
    const result = Formatters.isErrorStatus('DISCONNECTED');
    assert.strictEqual(result, false, 'DISCONNECTED should not be an error status');
});

QUnit.test('The setKeyStateColor method returns the correct color for key states', function (assert) {
    assert.strictEqual(Formatters.setKeyStateColor(KeyStates.DISABLED), 2, 'DISABLED should return 2');
    assert.strictEqual(Formatters.setKeyStateColor(KeyStates.ENABLED), 8, 'ENABLED should return 8');
    assert.strictEqual(Formatters.setKeyStateColor(KeyStates.PENDING_DELETION), 5, 'PENDING_DELETION should return 5');
    assert.strictEqual(Formatters.setKeyStateColor(KeyStates.DELETED), 5, 'DELETED should return 5');
    assert.strictEqual(Formatters.setKeyStateColor(KeyStates.PENDING_IMPORT), 6, 'PENDING_IMPORT should return 6');
    assert.strictEqual(Formatters.setKeyStateColor(KeyStates.PENDING_CREATION), 1, 'PENDING_CREATION should return 1');
    assert.strictEqual(Formatters.setKeyStateColor(KeyStates.PENDING_REGISTRATION), 1, 'PENDING_REGISTRATION should return 1');
    assert.strictEqual(Formatters.setKeyStateColor(KeyStates.UNKNOWN), 10, 'UNKNOWN should return 10');
});

QUnit.test('The setKeyStateColor method returns 10 for an unknown state', function (assert) {
    const result = Formatters.setKeyStateColor('INVALID_STATE');
    assert.strictEqual(result, 10, 'An unknown state should return the default color 10');
});

QUnit.test('Returns creatorID when creatorName is undefined', function (assert) {
    const result = Formatters.setCreatorDetails(undefined, 'user123');
    assert.strictEqual(result, 'user123', 'Should return creatorID when creatorName is undefined');
});

QUnit.test('Returns creatorID when creatorName is an empty string', function (assert) {
    const result = Formatters.setCreatorDetails('', 'user123');
    assert.strictEqual(result, 'user123', 'Should return creatorID when creatorName is empty');
});

QUnit.test('Returns creatorID when creatorName is UNKNOWN', function (assert) {
    const result = Formatters.setCreatorDetails('UNKNOWN', 'user123');
    assert.strictEqual(result, 'user123', 'Should return creatorID when creatorName is UNKNOWN');
});

QUnit.test('Returns creatorName when creatorName is valid', function (assert) {
    const result = Formatters.setCreatorDetails('name@email.com', 'user123');
    assert.strictEqual(result, 'name@email.com', 'Should return creatorName when it is valid');
});

// NOTE: getText returns the i18n key verbatim when no resource model is registered
// (the test runtime has none), so translation-backed formatters are asserted against their keys.

QUnit.test('setTaskStatus maps task states to icons', function (assert) {
    assert.strictEqual(Formatters.setTaskStatus(TaskStates.SUCCESSFUL), 'sap-icon://message-success', 'SUCCESSFUL maps to success icon');
    assert.strictEqual(Formatters.setTaskStatus(TaskStates.WAIT_APPROVAL), 'sap-icon://lateness', 'WAIT_APPROVAL maps to lateness icon');
    assert.strictEqual(Formatters.setTaskStatus(TaskStates.INITIAL), 'sap-icon://lateness', 'INITIAL maps to lateness icon');
    assert.strictEqual(Formatters.setTaskStatus(TaskStates.FAILED), 'sap-icon://message-error', 'FAILED maps to error icon');
    assert.strictEqual(Formatters.setTaskStatus(TaskStates.REVOKED), 'sap-icon://message-error', 'REVOKED maps to error icon');
    assert.strictEqual(Formatters.setTaskStatus('WHATEVER' as TaskStates), 'sap-icon://question-mark', 'unknown state maps to question mark');
});

QUnit.test('setTaskStatusIndicationState maps task states to indication colors', function (assert) {
    assert.strictEqual(Formatters.setTaskStatusIndicationState(TaskStates.SUCCESSFUL), StateColors.GREEN, 'SUCCESSFUL is green');
    assert.strictEqual(Formatters.setTaskStatusIndicationState(TaskStates.WAIT_CONFIRMATION), StateColors.BLUE, 'WAIT_CONFIRMATION is blue');
    assert.strictEqual(Formatters.setTaskStatusIndicationState(TaskStates.EXPIRED), StateColors.RED, 'EXPIRED is red');
    assert.strictEqual(Formatters.setTaskStatusIndicationState(TaskStates.EXECUTING), StateColors.YELLOW, 'EXECUTING falls back to yellow');
});

QUnit.test('setSystemType translates known system types', function (assert) {
    assert.strictEqual(Formatters.setSystemType(SystemType.SYSTEM), 'SYSTEM', 'SYSTEM type');
    assert.strictEqual(Formatters.setSystemType(SystemType.SUBACCOUNT), 'subaccount', 'SUBACCOUNT type');
    assert.strictEqual(Formatters.setSystemType('OTHER' as SystemType), '', 'unknown type yields empty string');
});

QUnit.test('setSystemRole combines role and roleID', function (assert) {
    assert.strictEqual(Formatters.setSystemRole('Admin', 'R1'), 'R1 - Admin', 'role and roleID are combined');
    assert.strictEqual(Formatters.setSystemRole(undefined, 'R1'), 'R1', 'only roleID present');
    assert.strictEqual(Formatters.setSystemRole('Admin'), 'Admin', 'only role present');
    assert.strictEqual(Formatters.setSystemRole(), '', 'neither present yields empty string');
});

QUnit.test('setSystemStatusColor honours the underWorkflow flag', function (assert) {
    assert.strictEqual(Formatters.setSystemStatusColor(SystemStatus.FAILED, true), 'Indication15', 'underWorkflow overrides status colour');
});

QUnit.test('setSystemStatusText returns workflow text, translations, and empty string', function (assert) {
    assert.strictEqual(Formatters.setSystemStatusText(SystemStatus.CONNECTED, true), 'UNDER_WORKFLOW', 'underWorkflow yields workflow text');
    assert.strictEqual(Formatters.setSystemStatusText(SystemStatus.CONNECTED), 'CONNECTED', 'status is translated');
    assert.strictEqual(Formatters.setSystemStatusText(undefined), '', 'undefined status yields empty string');
});

QUnit.test('formatSubjectDN handles strings and nullish input', function (assert) {
    assert.strictEqual(Formatters.formatSubjectDN(null), '', 'null yields empty string');
    assert.strictEqual(Formatters.formatSubjectDN(undefined), '', 'undefined yields empty string');
    assert.strictEqual(Formatters.formatSubjectDN('CN=already,O=formatted'), 'CN=already,O=formatted', 'a string is returned unchanged');
});
QUnit.test('formatSubjectDN orders known keys and appends extras', function (assert) {
    const subject: SubjectDN = { O: 'SAP', CN: 'example.com', C: 'DE', custom: 'x' };
    assert.strictEqual(Formatters.formatSubjectDN(subject), 'CN=example.com, O=SAP, C=DE, custom=x', 'keys are emitted in canonical order with extras last');
});
QUnit.test('formatSubjectDN expands array-valued OU entries', function (assert) {
    const subject: SubjectDN = { CN: 'a', OU: ['One', 'Two'] };
    assert.strictEqual(Formatters.formatSubjectDN(subject), 'CN=a, OU=One, OU=Two', 'each OU value becomes its own segment');
});

QUnit.test('formatSubjectDNField joins arrays and passes through scalars', function (assert) {
    assert.strictEqual(Formatters.formatSubjectDNField(['a', '', 'b', null as unknown as string]), 'a\nb', 'empty and nullish entries are filtered before joining');
    assert.strictEqual(Formatters.formatSubjectDNField('single'), 'single', 'scalar is returned unchanged');
    assert.strictEqual(Formatters.formatSubjectDNField(undefined), '', 'undefined yields empty string');
});

QUnit.test('formatSubjectOULabel is plural only for multiple values', function (assert) {
    assert.strictEqual(Formatters.formatSubjectOULabel(['One', 'Two']), 'subjectOUs:', 'plural label for multiple OUs');
    assert.strictEqual(Formatters.formatSubjectOULabel('One'), 'subjectOU:', 'singular label for a single OU');
    assert.strictEqual(Formatters.formatSubjectOULabel(undefined), 'subjectOU:', 'singular label when absent');
});

QUnit.test('formatCert embeds root CA and formatted subject', function (assert) {
    const result = Formatters.formatCert('MyRootCA', { CN: 'a' });
    assert.strictEqual(result, 'Root CA:\n MyRootCA\nSubject:\nCN=a', 'root CA and subject are combined');
});

QUnit.test('setGroupRole translates known roles and echoes unknown ones', function (assert) {
    assert.strictEqual(Formatters.setGroupRole(GroupRoles.KEY_ADMINISTRATOR), 'keyAdministrator', 'key administrator role');
    assert.strictEqual(Formatters.setGroupRole(GroupRoles.TENANT_AUDITOR), 'tenantAuditor', 'tenant auditor role');
    assert.strictEqual(Formatters.setGroupRole('CUSTOM' as GroupRoles), 'CUSTOM', 'unknown role is echoed');
});

QUnit.test('setNativeIdLabel maps HYOK providers to labels', function (assert) {
    assert.strictEqual(Formatters.setNativeIdLabel(HYOKProviders.AWS), 'keyARN', 'AWS label');
    assert.strictEqual(Formatters.setNativeIdLabel(HYOKProviders.FORTANIX), 'fortanixKeyName', 'Fortanix label');
    assert.strictEqual(Formatters.setNativeIdLabel(HYOKProviders.GCP), 'keyResourceName', 'GCP label');
    assert.strictEqual(Formatters.setNativeIdLabel('OTHER'), '', 'unknown provider yields empty string');
});

QUnit.test('setKeyStateText translates known states and echoes unknown ones', function (assert) {
    assert.strictEqual(Formatters.setKeyStateText(KeyStates.ENABLED), 'enabled', 'ENABLED translation');
    assert.strictEqual(Formatters.setKeyStateText(KeyStates.PENDING_DELETION), 'pendingDeletion', 'PENDING_DELETION translation');
    assert.strictEqual(Formatters.setKeyStateText('CUSTOM'), 'CUSTOM', 'unknown state is echoed');
});

QUnit.test('isKeyLifecyclePending recognises pending states', function (assert) {
    assert.strictEqual(Formatters.isKeyLifecyclePending(KeyStates.PENDING_IMPORT), true, 'PENDING_IMPORT is pending');
    assert.strictEqual(Formatters.isKeyLifecyclePending(KeyStates.PENDING_DELETION), true, 'PENDING_DELETION is pending');
    assert.strictEqual(Formatters.isKeyLifecyclePending(KeyStates.ENABLED), false, 'ENABLED is not pending');
});

QUnit.test('setEnableMenuItemVisible respects key type and state', function (assert) {
    assert.strictEqual(Formatters.setEnableMenuItemVisible(KeyCreationTypes.HYOK, KeyStates.DISABLED), false, 'HYOK never shows enable');
    assert.strictEqual(Formatters.setEnableMenuItemVisible(KeyCreationTypes.BYOK, KeyStates.DISABLED), true, 'disabled non-HYOK shows enable');
    assert.strictEqual(Formatters.setEnableMenuItemVisible(KeyCreationTypes.BYOK, KeyStates.PENDING_IMPORT), true, 'pending non-HYOK shows enable');
    assert.strictEqual(Formatters.setEnableMenuItemVisible(KeyCreationTypes.BYOK, KeyStates.ENABLED), false, 'enabled key hides enable');
});

QUnit.test('setDisableMenuItemVisible respects key type and state', function (assert) {
    assert.strictEqual(Formatters.setDisableMenuItemVisible(KeyCreationTypes.HYOK, KeyStates.ENABLED), false, 'HYOK never shows disable');
    assert.strictEqual(Formatters.setDisableMenuItemVisible(KeyCreationTypes.BYOK, KeyStates.ENABLED), true, 'enabled non-HYOK shows disable');
    assert.strictEqual(Formatters.setDisableMenuItemVisible(KeyCreationTypes.BYOK, KeyStates.DISABLED), false, 'disabled key hides disable');
});

QUnit.test('setMakePrimaryMenuItemVisible covers the decision matrix', function (assert) {
    assert.strictEqual(Formatters.setMakePrimaryMenuItemVisible(true, KeyStates.ENABLED, KeyStates.ENABLED), false, 'already primary hides the action');
    assert.strictEqual(Formatters.setMakePrimaryMenuItemVisible(false, KeyStates.PENDING_IMPORT, KeyStates.ENABLED), true, 'pending key shows the action');
    assert.strictEqual(Formatters.setMakePrimaryMenuItemVisible(false, KeyStates.DISABLED, KeyStates.ENABLED), false, 'non-enabled non-pending key hides the action');
    assert.strictEqual(Formatters.setMakePrimaryMenuItemVisible(false, KeyStates.ENABLED, KeyStates.DISABLED), false, 'disabled primary blocks the action');
    assert.strictEqual(Formatters.setMakePrimaryMenuItemVisible(false, KeyStates.ENABLED, KeyStates.ENABLED), true, 'enabled key with enabled primary shows the action');
});

QUnit.test('setKeyLifecycleActionEnabled is the inverse of pending', function (assert) {
    assert.strictEqual(Formatters.setKeyLifecycleActionEnabled(KeyStates.ENABLED), true, 'enabled key allows lifecycle actions');
    assert.strictEqual(Formatters.setKeyLifecycleActionEnabled(KeyStates.PENDING_IMPORT), false, 'pending key blocks lifecycle actions');
});
QUnit.test('setKeyLifecycleActionTooltip only shows text while pending', function (assert) {
    assert.strictEqual(Formatters.setKeyLifecycleActionTooltip(KeyStates.PENDING_IMPORT), 'keyLifecycleActionPendingTooltip', 'pending key shows tooltip');
    assert.strictEqual(Formatters.setKeyLifecycleActionTooltip(KeyStates.ENABLED), '', 'enabled key has no tooltip');
});

QUnit.test('provider display predicates match their provider', function (assert) {
    assert.strictEqual(Formatters.displayFortanixField(HYOKProviders.FORTANIX), true, 'Fortanix field shown for Fortanix');
    assert.strictEqual(Formatters.displayFortanixField(HYOKProviders.AWS), false, 'Fortanix field hidden for AWS');
    assert.strictEqual(Formatters.displayAWSField(HYOKProviders.AWS), true, 'AWS field shown for AWS');
    assert.strictEqual(Formatters.displayGCPField(HYOKProviders.GCP), true, 'GCP field shown for GCP');
    assert.strictEqual(Formatters.displayGCPField(HYOKProviders.AWS), false, 'GCP field hidden for AWS');
});

QUnit.test('setConnectSystemInfoMessageStripVisible is true for actionable workflow statuses', function (assert) {
    assert.strictEqual(Formatters.setConnectSystemInfoMessageStripVisible(WorkflowStatus.WORKFLOW_ALREADY_EXISTS), true, 'already exists is visible');
    assert.strictEqual(Formatters.setConnectSystemInfoMessageStripVisible(WorkflowStatus.WORKFLOW_REQUIRED), true, 'required is visible');
    assert.strictEqual(Formatters.setConnectSystemInfoMessageStripVisible(WorkflowStatus.ERROR), true, 'error is visible');
    assert.strictEqual(Formatters.setConnectSystemInfoMessageStripVisible(WorkflowStatus.WORKFLOW_NOT_REQUIRED), false, 'not required is hidden');
});
QUnit.test('setConnectSystemInfoMessageStripText maps statuses to messages', function (assert) {
    assert.strictEqual(Formatters.setConnectSystemInfoMessageStripText(WorkflowStatus.WORKFLOW_ALREADY_EXISTS), 'workflowAlreadyExistsMessage', 'already exists message');
    assert.strictEqual(Formatters.setConnectSystemInfoMessageStripText(WorkflowStatus.WORKFLOW_REQUIRED), 'connnectSystemNeedsApprovalMessage', 'required message');
    assert.strictEqual(Formatters.setConnectSystemInfoMessageStripText(WorkflowStatus.ERROR), 'errorGeneric', 'error message');
    assert.strictEqual(Formatters.setConnectSystemInfoMessageStripText(WorkflowStatus.WORKFLOW_NOT_REQUIRED), '', 'not required yields empty string');
});

QUnit.test('formatActionAndArtifact combines translated action, artifact and name', function (assert) {
    const result = Formatters.formatActionAndArtifact(ArtifactTypes.SYSTEM, ActionTypes.LINK, 'MySystem');
    assert.strictEqual(result, 'LINK \r\n SYSTEM \r\n MySystem', 'action, artifact and name are combined');
});
QUnit.test('formatActionAndArtifact returns empty string when action or artifact is missing', function (assert) {
    assert.strictEqual(Formatters.formatActionAndArtifact('' as ArtifactTypes, ActionTypes.LINK, 'x'), '', 'missing artifact yields empty string');
    assert.strictEqual(Formatters.formatActionAndArtifact(ArtifactTypes.KEY, '' as ActionTypes, 'x'), '', 'missing action yields empty string');
});

QUnit.test('appendIDToLabelText and appendNameToLabelText annotate the label', function (assert) {
    assert.strictEqual(Formatters.appendIDToLabelText('systemLabel'), 'systemLabel (ID)', 'ID suffix is appended');
    assert.strictEqual(Formatters.appendNameToLabelText('systemLabel'), 'systemLabel (name)', 'name suffix is appended');
});

QUnit.test('isCryptoDetailEditable is true when any entry is editable', function (assert) {
    const entry = (isEditable: boolean) => ({ key: 'k', value: { isEditable } as AWSAccessDetails });
    assert.strictEqual(Formatters.isCryptoDetailEditable([entry(false), entry(true)]), true, 'an editable entry makes the detail editable');
    assert.strictEqual(Formatters.isCryptoDetailEditable([entry(false)]), false, 'no editable entry means not editable');
    assert.notOk(Formatters.isCryptoDetailEditable(undefined as unknown as { key: string, value: AWSAccessDetails }[]), 'undefined is falsy');
});

QUnit.test('isBYOKPendingImport is true only for BYOK pending import', function (assert) {
    assert.strictEqual(Formatters.isBYOKPendingImport(KeyCreationTypes.BYOK, KeyStates.PENDING_IMPORT), true, 'BYOK pending import qualifies');
    assert.strictEqual(Formatters.isBYOKPendingImport(KeyCreationTypes.BYOK, KeyStates.ENABLED), false, 'enabled BYOK does not qualify');
    assert.strictEqual(Formatters.isBYOKPendingImport(KeyCreationTypes.HYOK, KeyStates.PENDING_IMPORT), false, 'HYOK does not qualify');
});

QUnit.test('formatErrorDetails returns DISCONNECTED fallback when no message is provided', function (assert) {
    assert.strictEqual(Formatters.formatErrorDetails('DISCONNECTED', ''), 'disconnected', 'DISCONNECTED without a message uses the fallback');
});

QUnit.test('isAutogeneratedGroup detects tenant admin/auditor groups', function (assert) {
    assert.strictEqual(Formatters.isAutogeneratedGroup('TenantAdministrator'), true, 'tenant administrator group is autogenerated');
    assert.strictEqual(Formatters.isAutogeneratedGroup('MyTenantAuditorGroup'), true, 'tenant auditor group is autogenerated');
    assert.strictEqual(Formatters.isAutogeneratedGroup('Custom Group'), false, 'a custom group is not autogenerated');
    assert.strictEqual(Formatters.isAutogeneratedGroup(''), false, 'empty name is not autogenerated');
});
QUnit.test('group edit/delete are disabled for autogenerated groups', function (assert) {
    assert.strictEqual(Formatters.isGroupDeleteEnabled('TenantAdministrator'), false, 'autogenerated group cannot be deleted');
    assert.strictEqual(Formatters.isGroupDeleteEnabled('Custom'), true, 'custom group can be deleted');
    assert.strictEqual(Formatters.isGroupEditEnabled('TenantAuditor'), false, 'autogenerated group cannot be edited');
    assert.strictEqual(Formatters.isGroupEditEnabled('Custom'), true, 'custom group can be edited');
});
QUnit.test('autogeneratedGroupTooltip only shows text for autogenerated groups', function (assert) {
    assert.strictEqual(Formatters.autogeneratedGroupTooltip('TenantAdministrator'), 'autogeneratedGroupActionDisabledTooltip', 'autogenerated group shows tooltip');
    assert.strictEqual(Formatters.autogeneratedGroupTooltip('Custom'), '', 'custom group has no tooltip');
});
