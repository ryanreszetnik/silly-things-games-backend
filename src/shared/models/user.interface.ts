export interface User {
  uid: string; //PK
  gid?: string;
  createdAt: number;
  firstName?: string;
  lastName?: string;
  bio?: string;
  imageUrl?: string;
}
