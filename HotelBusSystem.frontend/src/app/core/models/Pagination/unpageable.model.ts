export interface Pageablenull{
    unpaged: boolean;
    paged: boolean;
    pageNumber: number;
    pageSize: number;
    offset: number;
    sort: Sortnull;
}
export interface Sortnull{
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
}