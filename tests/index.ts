#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads the given spec files to determine which browser instances are needed, and runs wdio with the appropriate
 * BROWSERS env var.
 *
 * Usage: tsx tests/index.ts <wdio-config-file> <test-files...>
 * Example: tsx tests/index.ts tests/wdio.firefox.conf.ts tests/specs/jaas/*.spec.ts
 */
async function setupBrowsersAndRun() {
    try {
        const args = process.argv.slice(2);

        if (args.length < 2) {
            console.error('Usage: tsx tests/index.ts <wdio-config-file> <test-files...>');
            console.error('Example: tsx tests/index.ts tests/wdio.conf.ts tests/specs/jaas/*.spec.ts');
            process.exit(1);
        }

        const configFile = args[0];
        const testPatterns = args.slice(1);

        // Resolve test file patterns to actual files
        let specFiles: string[] = [];
        for (const pattern of testPatterns) {
            if (pattern.includes('*')) {
                // Handle glob patterns
                const matches = glob.sync(pattern, { cwd: process.cwd() });
                specFiles.push(...matches);
            } else {
                // Handle direct file paths
                specFiles.push(pattern);
            }
        }

        // Convert to absolute paths
        specFiles = specFiles.map(file => path.resolve(file));

        if (specFiles.length === 0) {
            console.error('No test files found matching the provided patterns');
            process.exit(1);
        }

        console.log(`Analyzing ${specFiles.length} test file(s) to determine browser requirements...`);

        // Import test files to populate testProperties
        const neededBrowsers = new Set<string>();

        // Set up minimal test globals to avoid "describe is not defined" errors
        (global as any).describe = () => {};
        (global as any).it = () => {};
        (global as any).expect = () => {};
        (global as any).beforeEach = () => {};
        (global as any).afterEach = () => {};
        (global as any).before = () => {};
        (global as any).after = () => {};

        for (const file of specFiles) {
            try {
                // Import the test file to trigger setTestProperties calls
                await import(file);
                console.log(`Analyzed: ${path.relative(process.cwd(), file)}`);
            } catch (error) {
                console.warn(`Warning: Could not analyze ${file}:`, (error as Error).message);
            }
        }

        // Import TestProperties to get the registered properties
        const { testProperties, getTestProperties } = await import('./helpers/TestProperties.js');

        // Determine needed browsers from all analyzed files
        for (const file of specFiles) {
            const props = await getTestProperties(file);
            if (props.usesBrowsers) {
                props.usesBrowsers.forEach((browser: string) => neededBrowsers.add(browser));
            }
        }

        // If no browsers determined, default to all
        if (neededBrowsers.size === 0) {
            ['p1', 'p2', 'p3', 'p4'].forEach(browser => neededBrowsers.add(browser));
        }

        const browsersEnv = Array.from(neededBrowsers).sort().join(',');
        console.log(`Required browsers: ${browsersEnv}`);

        // Create specs array for WebDriverIO (convert to relative paths from config file directory)
        const configDir = path.dirname(path.resolve(configFile));
        const specsForWdio = specFiles.map(file => path.relative(configDir, file));

        // Run wdio with the determined BROWSERS environment variable
        const env = {
            ...process.env,
            BROWSERS: browsersEnv
        };

        const wdioArgs = ['run', configFile, '--spec', ...specFiles];
        console.log(`Running: wdio ${wdioArgs.join(' ')}`);
        console.log(`Environment: BROWSERS=${browsersEnv}`);

        const wdioProcess = spawn('wdio', wdioArgs, {
            env,
            stdio: 'inherit',
            cwd: process.cwd()
        });

        wdioProcess.on('close', (code) => {
            process.exit(code || 0);
        });

        wdioProcess.on('error', (error) => {
            console.error('Failed to start wdio:', error);
            process.exit(1);
        });

    } catch (error) {
        console.error('Error setting up browsers:', error);
        process.exit(1);
    }
}

setupBrowsersAndRun();
