export class AuthResponseDto {
  accessToken: string;
  user: {
    id: number;
    email: string;
    username: string;
    emailVerified: boolean;
    status: string;
  };
}
