export interface JwtPayload {
  userid: string;
  name: string;
  api_key: string | null;
}
