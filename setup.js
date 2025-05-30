#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");


// Detect package manager (npm, pnpm, or yarn)
const isPnpm = process.argv.includes("--pnpm");
const isYarn = process.argv.includes("--yarn");
const installCmd = isPnpm ? "pnpm add" : isYarn ? "yarn add" : "npm install --save";

// Install Redux packages in the user's project
console.log("Installing Redux packages...");
execSync(`${installCmd} redux react-redux @reduxjs/toolkit`, {
  stdio: "inherit",
});


// Helper to ensure directories exist
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Base directory for files (assuming Next.js app directory structure)
const baseDir = process.cwd();

// Create Redux files

// 1. demoSlice.js
const demoSlicePath = path.join(
  baseDir,
  "src",
  "app",
  "redux",
  "features",
  "demo",
  "demoSlice.js"
);
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
  `.trim()
);

// 2. store.js
const storePath = path.join(baseDir, "src", "app", "redux", "store.js");
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
  `.trim()
);

// 3. provider.jsx
const providerPath = path.join(baseDir, "src", "app", "redux", "provider.jsx");
ensureDir(providerPath);
fs.writeFileSync(
  providerPath,
  `
'use client';

import { Provider } from "react-redux";
import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { store } from './store';

export function ReduxProvider({ children }) {
  // Use useRef to maintain store instance across re-renders
  const storeRef = useRef(null);
  const [storeVersion, setStoreVersion] = useState(0);
  
  // Initialize store only once using useMemo, but allow re-creation when needed
  const storeInstance = useMemo(() => {
    // Only create store if it doesn't exist or if we need a new version
    if (!storeRef.current) {
      storeRef.current = typeof store === 'function' ? store() : store;
      
      // Subscribe to store changes to trigger re-renders when state changes
      if (storeRef.current && typeof storeRef.current.subscribe === 'function') {
        const unsubscribe = storeRef.current.subscribe(() => {
          // Force re-render when store state changes
          setStoreVersion(prev => prev + 1);
        });
        
        // Store the unsubscribe function for cleanup
        storeRef.current._unsubscribe = unsubscribe;
      }
    }
    return storeRef.current;
  }, []); // Empty dependency array - store should only be created once

  // Effect to handle store subscription and cleanup
  useEffect(() => {
    const currentStore = storeRef.current;
    
    // Development-only logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Redux Provider mounted, store version:', storeVersion);
    }
    
    return () => {
      // Cleanup subscription when component unmounts
      if (currentStore && currentStore._unsubscribe) {
        currentStore._unsubscribe();
        delete currentStore._unsubscribe;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Redux Provider cleanup');
      }
    };
  }, [storeVersion]);

  // Don't memoize the Provider itself to allow re-renders when store changes
  return (
    <Provider store={storeInstance}>
      {children}
    </Provider>
  );
}

// Alternative version that's simpler but still reactive
export function SimpleReduxProvider({ children }) {
  const storeRef = useRef(null);
  const [, forceUpdate] = useState({});
  
  // Create store instance only once
  const storeInstance = useMemo(() => {
    if (!storeRef.current) {
      storeRef.current = typeof store === 'function' ? store() : store;
    }
    return storeRef.current;
  }, []);

  // Force re-render when store state changes
  useEffect(() => {
    if (storeInstance && typeof storeInstance.subscribe === 'function') {
      const unsubscribe = storeInstance.subscribe(() => {
        // Trigger re-render by updating state
        forceUpdate({});
      });

      return unsubscribe;
    }
  }, [storeInstance]);

  return (
    <Provider store={storeInstance}>
      {children}
    </Provider>
  );
}

// Most recommended version - balances optimization with reactivity
export function OptimizedReduxProvider({ children }) {
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

// Export the recommended version as default
export default OptimizedReduxProvider;

  `.trim()
);

// 4. Modify layout.js
const layoutPath = path.join(baseDir, "src", "app", "layout.js");
const importStatement = `import { ReduxProvider } from './redux/provider';`;

if (fs.existsSync(layoutPath)) {
  let content = fs.readFileSync(layoutPath, "utf8");

  // Check if ReduxProvider is already set up
  if (content.includes("ReduxProvider")) {
    console.log(
      "ReduxProvider already present in layout.js. Skipping modification."
    );
  } else {
    // Add import statement if not present
    if (!content.includes(importStatement)) {
      content = `${importStatement}\n\n${content}`;
    }

    // Find the return statement and wrap its content with ReduxProvider
    const returnIndex = content.indexOf("return (");
    if (returnIndex !== -1) {
      const start = returnIndex + "return (".length;
      const end = content.lastIndexOf(");");
      if (end > start) {
        const returnContent = content.substring(start, end).trim();
        const modifiedContent = `
          <ReduxProvider>
            ${returnContent}
          </ReduxProvider>
        `;
        content =
          content.substring(0, start) +
          modifiedContent +
          content.substring(end);
        fs.writeFileSync(layoutPath, content.trim());
        console.log("Modified layout.js to include ReduxProvider.");
      } else {
        console.log(
          "Could not find valid return statement in layout.js. Please add ReduxProvider manually."
        );
      }
    } else {
      console.log(
        "Could not find return statement in layout.js. Please add ReduxProvider manually."
      );
    }
  }
} else {
  console.log(
    "src/app/layout.js not found. Creating a new one with ReduxProvider..."
  );
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
    `.trim()
  );
}

console.log("✅ Redux setup complete!");
