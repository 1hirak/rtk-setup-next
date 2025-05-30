#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to ensure directory exists
function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Function to detect the package manager
function detectPackageManager() {
    // Check for explicit flags first (highest priority)
    if (process.argv.includes("--pnpm")) {
        return "pnpm";
    }
    if (process.argv.includes("--yarn")) {
        return "yarn";
    }
    if (process.argv.includes("--npm")) { // Add an explicit npm flag for consistency
        return "npm";
    }

    // Check for lock files in the current directory (common for existing projects)
    const currentDir = process.cwd();
    if (fs.existsSync(path.join(currentDir, 'pnpm-lock.yaml'))) {
        return "pnpm";
    }
    if (fs.existsSync(path.join(currentDir, 'yarn.lock'))) {
        return "yarn";
    }
    if (fs.existsSync(path.join(currentDir, 'package-lock.json'))) {
        return "npm";
    }

    // Fallback: Check if executables are globally available
    try {
        execSync('pnpm --version', { stdio: 'pipe' });
        return "pnpm";
    } catch (e) {
        // pnpm not found
    }
    try {
        execSync('yarn --version', { stdio: 'pipe' });
        return "yarn";
    } catch (e) {
        // yarn not found
    }

    // Default to npm if nothing else is found
    return "npm";
}

// Determine the package manager to use
const packageManager = detectPackageManager();
let installCmd;

switch (packageManager) {
    case "pnpm":
        installCmd = "pnpm add";
        console.log("Detected pnpm. Using 'pnpm add' for installation.");
        break;
    case "yarn":
        installCmd = "yarn add";
        console.log("Detected yarn. Using 'yarn add' for installation.");
        break;
    case "npm":
    default: // Fallback to npm if no specific manager is detected or explicitly requested
        installCmd = "npm install --save";
        console.log("Detected npm (or no specific package manager preferred). Using 'npm install --save' for installation.");
        break;
}


// Install Redux packages in the user's project
console.log('Installing Redux packages (redux, react-redux, @reduxjs/toolkit)...');
try {
    execSync(`${installCmd} redux react-redux @reduxjs/toolkit`, { stdio: 'inherit' });
    console.log("✅ Redux packages installed successfully.");
} catch (error) {
    console.error(`❌ Installation failed with ${packageManager}:`, error.message);
    if (error.stdout) console.error("Stdout:", error.stdout.toString());
    if (error.stderr) console.error("Stderr:", error.stderr.toString());
    process.exit(1);
}

// Base directory for files (assuming Next.js app directory structure)
const baseDir = process.cwd();

console.log("\nCreating Redux boilerplate files...");

// 1. demoSlice.js
const demoSlicePath = path.join(baseDir, 'src', 'app', 'redux', 'features', 'demo', 'demoSlice.js');
ensureDir(demoSlicePath);
fs.writeFileSync(
  demoSlicePath,
  `
import { createSlice } from "@reduxjs/toolkit";

const demoSlice = createSlice({
  name: "demo",
  initialState: {
    value: 0,
  },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
  }
});

export const { increment, decrement } = demoSlice.actions;

export default demoSlice.reducer;
  `.trim() + "\n" // Added newline for proper file formatting
);
console.log(`Created: ${path.relative(baseDir, demoSlicePath)}`);


// 2. store.js
const storePath = path.join(baseDir, 'src', 'app', 'redux', 'store.js');
ensureDir(storePath);
fs.writeFileSync(
  storePath,
  `
import { configureStore } from '@reduxjs/toolkit';
import demoReducer from './features/demo/demoSlice';

export const store = () => {
  return configureStore({
    reducer: {
      demo: demoReducer
    }
  });
};
  `.trim() + "\n"
);
console.log(`Created: ${path.relative(baseDir, storePath)}`);


// 3. provider.jsx
const providerPath = path.join(baseDir, 'src', 'app', 'redux', 'provider.jsx');
ensureDir(providerPath);
fs.writeFileSync(
  providerPath,
  `
'use client';

import { Provider } from "react-redux";
import { useRef, useEffect, useMemo } from "react"; // Removed useCallback, useState as they were unused in the optimized version
import { store } from './store';

// Export the recommended version as default
export function ReduxProvider({ children }) { // Changed name from OptimizedReduxProvider to ReduxProvider for consistency
  const storeRef = useRef(null);
  
  // Initialize store only once
  if (!storeRef.current) {
    storeRef.current = typeof store === 'function' ? store() : store;
  }

  // Memoize children to prevent unnecessary re-renders of child components
  // but don't memoize the Provider wrapper itself
  const memoizedChildren = useMemo(() => children, [children]);

  // Effect for cleanup
  useEffect(() => {
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Redux Provider unmounted');
      }
    };
  }, []);

  return (
    <Provider store={storeRef.current}>
      {memoizedChildren}
    </Provider>
  );
}

export default ReduxProvider; // Exported ReduxProvider as default for simplicity
  `.trim() + "\n"
);
console.log(`Created: ${path.relative(baseDir, providerPath)}`);


// 4. Modify layout.js
const layoutPath = path.join(baseDir, 'src', 'app', 'layout.js');
const importStatement = `import { ReduxProvider } from './redux/provider';`;

console.log('\nModifying src/app/layout.js...');

if (fs.existsSync(layoutPath)) {
  let content = fs.readFileSync(layoutPath, 'utf8');

  // Check if ReduxProvider is already set up
  if (content.includes('ReduxProvider')) {
    console.log('ReduxProvider already present in layout.js. Skipping modification.');
  } else {
    // Add import statement if not present
    if (!content.includes(importStatement)) {
      content = `${importStatement}\n\n${content}`;
    }

    // --- NEW ROBUST LAYOUT.JS MODIFICATION LOGIC ---
    // This regex looks for the 'return (' followed by any content, and then the closing ')' at the same indentation level.
    // It's more forgiving with whitespace and newlines.
    const returnBlockRegex = /(return\s*\([\s\S]*?\n\s*\);?)/;
    const match = content.match(returnBlockRegex);

    if (match) {
      const originalReturnStatement = match[1]; // The whole 'return (...);' block
      
      // Extract the content inside the parentheses
      const innerContentMatch = originalReturnStatement.match(/return\s*\(([\s\S]*)\)\s*;?/);
      if (innerContentMatch && innerContentMatch[1]) {
        const innerContent = innerContentMatch[1].trim(); // Content between ( and )
        
        // Wrap the extracted content with ReduxProvider
        const wrappedContent = `
return (
  <ReduxProvider>
    ${innerContent}
  </ReduxProvider>
);
        `;
        // Replace the original return statement with the wrapped one
        content = content.replace(originalReturnStatement, wrappedContent);
        fs.writeFileSync(layoutPath, content.trim() + "\n");
        console.log('Modified layout.js to include ReduxProvider.');
      } else {
        console.log('Could not extract content from "return (...)" in layout.js. Please add ReduxProvider manually.');
      }
    } else {
      console.log('Could not find a suitable "return (...)" statement in layout.js. Please add ReduxProvider manually.');
    }
  }
} else {
  console.log('src/app/layout.js not found. Creating a new one with ReduxProvider...');
  ensureDir(layoutPath);
  fs.writeFileSync(
    layoutPath,
    `
${importStatement}

export default function RootLayout({ children }) {
  return (
    <ReduxProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ReduxProvider>
  );
}
    `.trim() + "\n"
  );
  console.log(`Created: ${path.relative(baseDir, layoutPath)}`);
}

console.log('✅ Redux setup complete!');