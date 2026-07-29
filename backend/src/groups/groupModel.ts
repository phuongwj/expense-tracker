export interface Group {
    id: string;
    name: string;
    joinCode: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface GroupMember {
    id: string;
    groupId: string;
    userId: string;
    role: string;
    joinedAt: Date;
}

export interface GroupWithRole {
    id: string;
    name: string;
    role: string;
}

export interface MemberInfo {
    userId: string;
    firstName: string;
    lastName: string;
    role: string;
    joinedAt: Date;
}
