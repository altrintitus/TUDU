export function firstLine(text: string): string {
  return text.split('\n')[0].trim() || 'Untitled';
}
