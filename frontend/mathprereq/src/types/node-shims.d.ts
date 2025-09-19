declare module 'path' {
  export function resolve(...parts: string[]): string;
}

declare const process: {
  cwd(): string;
};
