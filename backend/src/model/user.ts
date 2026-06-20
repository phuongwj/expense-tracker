export interface User {
    name: string;
    email: string;
    password_hash: string;
    created_at: Date;
}

export type PublicUser = Omit<User, 'password_hash'>;