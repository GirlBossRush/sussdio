## API Report File for "@sussudio/base/common/numbers"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

// @public (undocumented)
export function clamp(value: number, min: number, max: number): number;

// @public (undocumented)
export class Counter {
    	// (undocumented)
    getNext(): number;
    	}

// @public (undocumented)
export class MovingAverage {
    	// (undocumented)
    update(value: number): number;
    	// (undocumented)
    get value(): number;
}

// @public (undocumented)
export function rot(index: number, modulo: number): number;

// @public (undocumented)
export class SlidingWindowAverage {
    	constructor(size: number);
    	// (undocumented)
    update(value: number): number;
    	// (undocumented)
    get value(): number;
    	}

// (No @packageDocumentation comment for this package)

```
