export class YearHelper {
  /** NABL plans, environment monitoring, CRM consumption — recent ±2 years */
  static planYears(): number[] {
    return this.range(new Date().getFullYear() - 2, new Date().getFullYear() + 2);
  }

  /** Standards, specifications, product test groups — wide range */
  static standardYears(): number[] {
    return this.range(1950, new Date().getFullYear() + 5);
  }

  /** Employee education passing year */
  static educationYears(): number[] {
    return this.range(1970, new Date().getFullYear());
  }

  /** Descending list from end → start (most recent first) */
  private static range(start: number, end: number): number[] {
    const years: number[] = [];
    for (let y = end; y >= start; y--) years.push(y);
    return years;
  }
}
