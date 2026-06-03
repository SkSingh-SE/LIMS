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

    public static formatDateForInput(dateInput: any): string {
        if (!dateInput) return '';

        let date: Date;

        // If already a Date object
        if (dateInput instanceof Date) {
            date = dateInput;
        }
        // If timestamp (number)
        else if (typeof dateInput === 'number') {
            date = new Date(dateInput);
        }
        // If string
        else if (typeof dateInput === 'string') {
            // Handle ISO or standard formats
            if (!isNaN(Date.parse(dateInput))) {
                date = new Date(dateInput);
            }
            // Handle dd/MM/yyyy or dd-MM-yyyy manually
            else {
                const parts = dateInput.split(/[\/\-]/);
                if (parts.length === 3) {
                    const [day, month, year] = parts.map(Number);
                    date = new Date(year, month - 1, day);
                } else {
                    return '';
                }
            }
        } else {
            return '';
        }

        // Invalid date check
        if (isNaN(date.getTime())) return '';

        // Fix timezone issue (important!)
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

        return localDate.toISOString().split('T')[0];
    }
}


