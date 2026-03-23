import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  let pipe: TruncatePipe;

  beforeEach(() => {
    pipe = new TruncatePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return the original string if shorter than limit', () => {
    expect(pipe.transform('hello', 30)).toBe('hello');
  });

  it('should return the original string if equal to limit', () => {
    expect(pipe.transform('abc', 3)).toBe('abc');
  });

  it('should truncate and add ellipsis when string exceeds limit', () => {
    expect(pipe.transform('Hello World', 5)).toBe('Hello...');
  });

  it('should use default limit of 30', () => {
    const longString = 'a'.repeat(35);
    const result = pipe.transform(longString);
    expect(result).toBe('a'.repeat(30) + '...');
  });

  it('should use custom ellipsis', () => {
    expect(pipe.transform('Hello World', 5, '---')).toBe('Hello---');
  });

  it('should handle empty string', () => {
    expect(pipe.transform('', 10)).toBe('');
  });

  it('should convert numbers to strings', () => {
    expect(pipe.transform(12345, 3)).toBe('123...');
  });

  it('should handle limit of 0', () => {
    expect(pipe.transform('hello', 0)).toBe('...');
  });

  it('should handle empty ellipsis', () => {
    expect(pipe.transform('Hello World', 5, '')).toBe('Hello');
  });
});
