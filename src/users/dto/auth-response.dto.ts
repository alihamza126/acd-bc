export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    emailVerified: boolean;
    status: string;
  };
}
