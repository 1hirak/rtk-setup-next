# Redux Toolkit Next.js Setup

[![npm version](https://badge.fury.io/js/@1hirak/rtk-setup-next.svg)](https://badge.fury.io/js/%40hirak%2Frtk-setup-next)[![License MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple CLI tool to quickly set up Redux Toolkit in your Next.js 13+ App Router projects.

## Installation

    npx @hirak/rtk-setup-next

## What it does

This tool automatically:

* Installs Redux Toolkit and React Redux
* Creates a basic store configuration
* Sets up a demo counter slice
* Creates an optimized Redux provider
* Integrates everything into your Next.js layout

## Generated files

    src/app/
    ├── layout.js (modified to include Redux provider)
    └── redux/
        ├── store.js
        ├── provider.jsx
        └── features/
            └── demo/
                └── demoSlice.js

## Usage example

After running the setup, you can use Redux in any client component:

    'use client';
    
    import { useSelector, useDispatch } from 'react-redux';
    import { increment, decrement } from './app/redux/features/demo/demoSlice';
    
    export default function Counter() {
      const count = useSelector((state) => state.demo.value);
      const dispatch = useDispatch();
    
      return (
        <div>
          <p>Count: {count}</p>
          <button onClick={() => dispatch(increment())}>+</button>
          <button onClick={() => dispatch(decrement())}>-</button>
        </div>
      );
    }

## Adding new slices

Create new slices in the `src/app/redux/features/` directory:

    // src/app/redux/features/user/userSlice.js
    import { createSlice } from '@reduxjs/toolkit';
    
    const userSlice = createSlice({
      name: 'user',
      initialState: { name: '', email: '' },
      reducers: {
        setUser: (state, action) => {
          state.name = action.payload.name;
          state.email = action.payload.email;
        }
      }
    });
    
    export const { setUser } = userSlice.actions;
    export default userSlice.reducer;

Then add it to your store:

    // src/app/redux/store.js
    import { configureStore } from '@reduxjs/toolkit';
    import demoReducer from './features/demo/demoSlice';
    import userReducer from './features/user/userSlice';
    
    export const store = () => {
      return configureStore({
        reducer: {
          demo: demoReducer,
          user: userReducer
        }
      });
    };

## Requirements

* Node.js 16+
* Next.js 13+ with App Router
* React 18+

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/yourusername/rtk-setup-next).

## License

MIT