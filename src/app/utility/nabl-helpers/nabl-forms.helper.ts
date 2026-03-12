export class NablFormsHelper {
    public static getFormNumbers(): string[] {
        const forms: string[] = [];
        for (let i = 1; i <= 54; i++) {
            forms.push(`F-${i}`);
        }
        // include special variants
        forms.push('F-6A');
        return forms;
    }
}
