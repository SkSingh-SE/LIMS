export interface Country {
  name: string;
  iso2: string;        // Lowercase 2-letter ISO code e.g. 'in', 'us', 'gb'
  dialCode: string;    // Dial code including '+' e.g. '+91', '+1', '+44'
  flag: string;        // Fallback Unicode flag emoji e.g. '🇮🇳'
  priority?: number;   // Top priority ranking for common business destinations
  placeholder?: string;// Optional custom placeholder e.g. '98765 43210'
  digitLength?: number;// Strict digit length when applicable (e.g. 10 for India)
}
