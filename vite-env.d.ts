// Removing vite/client reference as it is missing in the environment
// Augmenting NodeJS.ProcessEnv to include API_KEY without redeclaring 'process'

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
