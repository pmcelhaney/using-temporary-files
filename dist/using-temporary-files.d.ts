interface Operations {
    add: (path: string, contents: string) => Promise<void>;
    addDirectory: (path: string) => Promise<void>;
    path: (...relativePaths: Readonly<string[]>) => string;
    read: (path: string) => Promise<string>;
    remove: (path: string) => Promise<void>;
}
interface DisposableOperations extends Readonly<Operations> {
    [Symbol.asyncDispose]: () => Promise<void>;
    [Symbol.dispose]: () => void;
    asyncDispose: () => Promise<void>;
    dispose: () => void;
}
type Callback = (operations: Readonly<Operations>) => Promise<void>;
export declare function temporaryFiles(): DisposableOperations;
export declare function usingTemporaryFiles(...callbacks: Readonly<Callback[]>): Promise<void>;
export {};
