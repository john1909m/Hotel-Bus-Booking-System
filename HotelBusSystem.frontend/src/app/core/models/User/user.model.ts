export type role = 
'ADMIN' | 
'USER';

export interface UserDto{
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: role;
}
export interface UserRequestDto{
    name: string;
    email: string;
    phoneNumber: string;
    role: role;
}