/// <reference types="nativewind/types" />

// Metro turns the stylesheet into NativeWind's runtime styles; TypeScript only
// needs to know the side-effect import is legal.
declare module '*.css';
