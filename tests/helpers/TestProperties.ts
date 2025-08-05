/**
 * An interface that tests can export (as a TEST_PROPERTIES property) to define what they require.
 */
export type ITestProperties = {
    /** The test uses the iFrame API. */
    useIFrameApi: boolean;
    /** The test requires jaas, it should be skipped when the jaas configuration is not enabled. */
    useJaas: boolean;
    /** The test requires the webhook proxy. */
    useWebhookProxy: boolean;
    usesBrowsers?: string[];
};

const defaultProperties: ITestProperties = {
    useIFrameApi: false,
    useWebhookProxy: false,
    useJaas: false,
    usesBrowsers: [ 'p1', 'p2', 'p3', 'p4' ]
};

function getDefaultProperties(filename: string): ITestProperties {
    const properties = { ...defaultProperties };

    properties.usesBrowsers = getDefaultBrowsers(filename);

    return properties;
}

function getDefaultBrowsers(filename: string): string[] {
    if (filename.includes('/alone/')) {
        return [ 'p1' ];
    }
    if (filename.includes('/2way/')) {
        return [ 'p1', 'p2' ];
    }
    if (filename.includes('/4way/')) {
        return [ 'p1', 'p2', 'p3' ];
    }
    return [ 'p1', 'p2', 'p3', 'p4' ];
}

/**
 * Maps a test filename to its registered properties.
 */
export const testProperties: Record<string, ITestProperties> = {};

/**
 * Set properties for a test file. This was needed because I couldn't find a hook that executes with describe() before
 * the code in wdio.conf.ts's before() hook. The intention is for tests to execute this directly. The properties don't
 * change dynamically.
 *
 * @param filename the absolute path to the test file
 * @param properties the properties to set for the test file, defaults will be applied for missing properties
 */
export function setTestProperties(filename: string, properties: Partial<ITestProperties>): void {
    if (testProperties[filename]) {
        console.warn(`Test properties for ${filename} are already set. Overwriting.`);
    }

    const finalProps = { ...getDefaultProperties(filename), ...properties };

    console.log(`Setting test properties for ${filename}:`, properties);
    testProperties[filename] = finalProps;
}

/**
 * @param testFilePath - The absolute path to the test file
 * @returns Promise<ITestProperties> - The test properties with defaults applied
 */
export async function getTestProperties(testFilePath: string): Promise<ITestProperties> {
    return testProperties[testFilePath] || getDefaultProperties(testFilePath);
}
