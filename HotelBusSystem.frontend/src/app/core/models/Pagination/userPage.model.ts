import { UserDto } from "../User/user.model";

export interface Pageable {
    unpaged: boolean;
    paged: boolean;
    pageNumber: number;
    pageSize: number;
    offset: number;
    sort: Sort;
}
export interface Sort{
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
}
export interface PageUserDto{
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    pageable: Pageable;
    numberOfElements: number;
    size: number;
    content: UserDto[];
    number: number;
    sort: Sort;
    empty: boolean;
}