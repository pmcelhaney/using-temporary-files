interface Operations {
    add: (path: string, contents: string) => Promise<void>;
    addDirectory: (path: string) => Promise<void>;
    path: (relativePaths: string) => string;
    read: (path: string) => Promise<string>;
    remove: (path: string) => Promise<void>;
}
type Callback = (operations: Readonly<Operations>) => Promise<void>;
export declare function usingTemporaryFiles(...callbacks: Readonly<Callback[]>): Promise<void>;
export {};
