export type role = 
'ADMIN' | 'USER';

export interface AuthResponse{
    token: string;
    tokenType: string;
    expiresIn: number;
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: role
}