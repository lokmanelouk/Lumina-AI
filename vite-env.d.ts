// Augment the existing NodeJS namespace to add API_KEY to ProcessEnv.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
