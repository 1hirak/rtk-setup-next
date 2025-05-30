#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Helper function to ensure directory exists
function ensureDir(filePath) {
  const dirName = path.dirname(filePath);
  if (fs.existsSync(dirName)) {
    return true;
  }
  fs.mkdirSync(dirName, { recursive: true });
}

const isPnpm = process.argv.includes("--pnpm");
const isYarn = process.argv.includes("--yarn");
const installCmd = isPnpm ? "pnpm add" : isYarn ? "yarn add" : "npm install --save";

// Install Redux packages in the user's project
console.log("Installing Redux packages...");
try {
  execSync(`${installCmd} redux react-redux @reduxjs/toolkit`, {
    stdio: "inherit",
  });
} catch (error) {
  console.error("Installation failed:", error.message);
  process.exit(1);
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
import { useRef, useEffect, useMemo } from "react";
import { store } from './store';


// Most recommended version - balances optimization with reactivity
export function ReduxProvider({ children }) {
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

export default ReduxProvider;

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
