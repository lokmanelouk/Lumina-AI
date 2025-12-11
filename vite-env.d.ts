// Augment the NodeJS namespace to include API_KEY in ProcessEnv.
// This assumes 'process' is already declared (e.g. by @types/node), resolving the redeclaration error.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
