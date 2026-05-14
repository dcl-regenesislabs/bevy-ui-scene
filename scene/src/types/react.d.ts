/**
 * Minimal type declaration for the `react` package.
 *
 * `react` is a transitive dependency of `@dcl/react-ecs`, so it lives in
 * `node_modules/react` at runtime even though we don't list it directly
 * in our `package.json`. The package ships no .d.ts files, so without
 * this shim TypeScript can't resolve `import { createContext } from 'react'`.
 *
 * We declare only the surface we actually use (Context API) instead of
 * pulling in `@types/react` (which would also bring DOM-specific types
 * that don't apply in the dcl-react-ecs world).
 *
 * Provider / Consumer return types are `any` so JSX usage doesn't fight
 * dcl-react-ecs's `JSX.Element` type — they render fine at runtime
 * because react-reconciler handles them, but the static return type from
 * raw `react` doesn't match.
 *
 * When `@dcl/react-ecs` exposes `createContext` / `useContext` officially
 * (PR https://github.com/decentraland/js-sdk-toolchain/pull/1388 or its
 * follow-up), delete this file and import from `'@dcl/react-ecs'` instead.
 */
declare module 'react' {
  export type Context<T> = {
    Provider: (props: { value: T; children?: any }) => any
    Consumer: (props: { children: (value: T) => any }) => any
    displayName?: string
  }

  export function createContext<T>(defaultValue: T): Context<T>
  export function useContext<T>(context: Context<T>): T
}
