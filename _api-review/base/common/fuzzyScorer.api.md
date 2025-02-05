## API Report File for "@sussudio/base/common/fuzzyScorer"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

// @public (undocumented)
export function compareItemsByFuzzyScore<T>(
	itemA: T,
	itemB: T,
	query: IPreparedQuery,
	allowNonContiguousMatches: boolean,
	accessor: IItemAccessor<T>,
	cache: FuzzyScorerCache,
): number;

// @public (undocumented)
export type FuzzyScore = [number, number[]];

// @public (undocumented)
export type FuzzyScore2 = [number | undefined, IMatch[]];

// @public (undocumented)
export type FuzzyScorerCache = {
    	[key: string]: IItemScore;
};

// @public (undocumented)
export interface IItemAccessor<T> {
    	getItemDescription(item: T): string | undefined;
    	getItemLabel(item: T): string | undefined;
    	getItemPath(file: T): string | undefined;
}

// @public
export interface IItemScore {
    	descriptionMatch?: IMatch[];
    	labelMatch?: IMatch[];
    	score: number;
}

// @public (undocumented)
interface IMatch {
    	// (undocumented)
    end: number;
    	// (undocumented)
    start: number;
}

// @public (undocumented)
export interface IPreparedQuery extends IPreparedQueryPiece {
    	containsPathSeparator: boolean;
    	values: IPreparedQueryPiece[] | undefined;
}

// @public (undocumented)
export interface IPreparedQueryPiece {
    	expectContiguousMatch: boolean;
    	normalized: string;
    	// (undocumented)
    normalizedLowercase: string;
    	original: string;
    	// (undocumented)
    originalLowercase: string;
    	pathNormalized: string;
}

// @public (undocumented)
export function pieceToQuery(piece: IPreparedQueryPiece): IPreparedQuery;

// @public (undocumented)
export function pieceToQuery(pieces: IPreparedQueryPiece[]): IPreparedQuery;

// @public (undocumented)
export function prepareQuery(original: string): IPreparedQuery;

// @public (undocumented)
export function scoreFuzzy(
	target: string,
	query: string,
	queryLower: string,
	allowNonContiguousMatches: boolean,
): FuzzyScore;

// @public (undocumented)
export function scoreFuzzy2(
	target: string,
	query: IPreparedQuery | IPreparedQueryPiece,
	patternStart?: number,
	wordStart?: number,
): FuzzyScore2;

// @public (undocumented)
export function scoreItemFuzzy<T>(
	item: T,
	query: IPreparedQuery,
	allowNonContiguousMatches: boolean,
	accessor: IItemAccessor<T>,
	cache: FuzzyScorerCache,
): IItemScore;

// (No @packageDocumentation comment for this package)

```
