import { Button$PressEvent } from 'sap/m/Button';
import MessageToast from 'sap/m/MessageToast';

export async function copyToClipboard(event: Button$PressEvent): Promise<void> {
    const textToCopy = event.getSource().data('textToCopy') as string;
    await navigator.clipboard.writeText(textToCopy);
    MessageToast.show('Copied to clipboard');
}

export function isUUIDValid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
}

export function _isNameValid(name: string): boolean {
    const nameRegex = /^.{3,}$/;
    if (!name || !nameRegex.test(name)) {
        return false;
    }
    return true;
};

export function setNameValueState(name: string) : { valueState: string, valueStateText: string } {
    if (!_isNameValid(name) || !name) {
        return {
            valueState: 'Error',
            valueStateText: 'Name is required and must be at least 3 characters long'
        };
    }
    return {
        valueState: 'None',
        valueStateText: ''
    };

}