import * as Helpers from 'kms/common/Helpers';
import { AxiosError } from 'axios';

QUnit.module('Helpers Unit Tests');

// Build an AxiosError whose message carries the serialized error envelope,
// mirroring how the API layer stringifies backend errors.
function makeAxiosError(envelope: object): AxiosError {
    return { message: JSON.stringify(envelope) } as AxiosError;
}

const fullEnvelope = {
    error: {
        message: 'top-level',
        data: {
            error: {
                code: 'KMS-1234',
                context: { reason: 'quota_exceeded' },
                message: 'Detailed backend message',
                requestID: 'req-abc-123',
                status: 500
            }
        }
    }
};

QUnit.test('isUUIDValid accepts a well-formed UUID', function (assert) {
    assert.strictEqual(Helpers.isUUIDValid('123e4567-e89b-12d3-a456-426614174000'), true, 'lowercase UUID is valid');
    assert.strictEqual(Helpers.isUUIDValid('123E4567-E89B-12D3-A456-426614174000'), true, 'uppercase UUID is valid');
});
QUnit.test('isUUIDValid rejects malformed input', function (assert) {
    assert.strictEqual(Helpers.isUUIDValid(''), false, 'empty string is invalid');
    assert.strictEqual(Helpers.isUUIDValid('not-a-uuid'), false, 'arbitrary string is invalid');
    assert.strictEqual(Helpers.isUUIDValid('123e4567-e89b-12d3-a456-42661417400'), false, 'too-short UUID is invalid');
    assert.strictEqual(Helpers.isUUIDValid('123e4567e89b12d3a456426614174000'), false, 'missing hyphens is invalid');
});

QUnit.test('_isNameValid enforces a 3-character minimum', function (assert) {
    assert.strictEqual(Helpers._isNameValid('abc'), true, 'exactly 3 characters is valid');
    assert.strictEqual(Helpers._isNameValid('a longer name'), true, 'longer names are valid');
    assert.strictEqual(Helpers._isNameValid('ab'), false, 'two characters is invalid');
    assert.strictEqual(Helpers._isNameValid(''), false, 'empty string is invalid');
    assert.strictEqual(Helpers._isNameValid(null as unknown as string), false, 'null is invalid');
});

QUnit.test('setNameValueState returns an error state for invalid names', function (assert) {
    const result = Helpers.setNameValueState('ab');
    assert.strictEqual(result.valueState, 'Error', 'value state is Error');
    assert.ok(result.valueStateText.length > 0, 'an explanatory message is provided');
});
QUnit.test('setNameValueState returns a clean state for valid names', function (assert) {
    const result = Helpers.setNameValueState('valid name');
    assert.strictEqual(result.valueState, 'None', 'value state is None');
    assert.strictEqual(result.valueStateText, '', 'no message for a valid name');
});

QUnit.test('convertDateToUTC produces an ISO string without milliseconds', function (assert) {
    const result = Helpers.convertDateToUTC(new Date('2026-01-15T10:20:30.500Z'));
    assert.strictEqual(result, '2026-01-15T10:20:30', 'milliseconds and the trailing Z are stripped');
});

QUnit.test('getErrorCode extracts the backend error code', function (assert) {
    assert.strictEqual(Helpers.getErrorCode(makeAxiosError(fullEnvelope)), 'KMS-1234', 'code is read from the envelope');
});
QUnit.test('getErrorCode returns empty string when the message is not an envelope', function (assert) {
    assert.strictEqual(Helpers.getErrorCode({ message: 'plain network error' } as AxiosError), '', 'non-envelope messages yield empty string');
});

QUnit.test('getRequestId extracts the request identifier', function (assert) {
    assert.strictEqual(Helpers.getRequestId(makeAxiosError(fullEnvelope)), 'req-abc-123', 'requestID is read from the envelope');
});
QUnit.test('getRequestId returns empty string without a requestID', function (assert) {
    assert.strictEqual(Helpers.getRequestId({ message: 'timeout' } as AxiosError), '', 'missing requestID yields empty string');
});

QUnit.test('getErrorStatus extracts the numeric status', function (assert) {
    assert.strictEqual(Helpers.getErrorStatus(makeAxiosError(fullEnvelope)), 500, 'status is read from the envelope');
});
QUnit.test('getErrorStatus returns undefined without a status', function (assert) {
    assert.strictEqual(Helpers.getErrorStatus({ message: 'boom' } as AxiosError), undefined, 'missing status yields undefined');
});

QUnit.test('getErrorContext extracts the context object', function (assert) {
    const context = Helpers.getErrorContext(makeAxiosError(fullEnvelope));
    assert.deepEqual(context, { reason: 'quota_exceeded' }, 'context is read from the envelope');
});
QUnit.test('getErrorContext returns undefined without a context', function (assert) {
    assert.strictEqual(Helpers.getErrorContext({ message: 'no context here' } as AxiosError), undefined, 'missing context yields undefined');
});

QUnit.test('getErrorDataMessage extracts the detailed message', function (assert) {
    assert.strictEqual(Helpers.getErrorDataMessage(makeAxiosError(fullEnvelope)), 'Detailed backend message', 'detailed message is read from the envelope');
});
QUnit.test('getErrorDataMessage returns undefined without a data envelope', function (assert) {
    assert.strictEqual(Helpers.getErrorDataMessage({ message: 'raw' } as AxiosError), undefined, 'non-envelope messages yield undefined');
});

QUnit.test('getAdditionalErrorDetails combines message and reason code', function (assert) {
    const result = Helpers.getAdditionalErrorDetails(makeAxiosError(fullEnvelope));
    assert.strictEqual(result, ' Detailed backend message (Error code: quota_exceeded)', 'message and reason are combined');
});
QUnit.test('getAdditionalErrorDetails uses only the message when no reason is present', function (assert) {
    const envelope = { error: { data: { error: { message: 'Only a message', requestID: 'r', status: 400 } } } };
    const result = Helpers.getAdditionalErrorDetails(makeAxiosError(envelope));
    assert.strictEqual(result, ' Only a message', 'reason clause is omitted when absent');
});
QUnit.test('getAdditionalErrorDetails uses only the reason when no message is present', function (assert) {
    const envelope = { error: { data: { error: { context: { reason: 'locked' }, requestID: 'r', status: 400 } } } };
    const result = Helpers.getAdditionalErrorDetails(makeAxiosError(envelope));
    assert.strictEqual(result, ' (Error code: locked)', 'message clause is omitted when absent');
});
QUnit.test('getAdditionalErrorDetails returns undefined when neither is present', function (assert) {
    const envelope = { error: { data: { error: { requestID: 'r', status: 400 } } } };
    assert.strictEqual(Helpers.getAdditionalErrorDetails(makeAxiosError(envelope)), undefined, 'no details when both message and reason are missing');
});
