export class LeaderResponseDto {
  id!: string;
  accountName!: string;
  entity!: { id: string; name: string };
  group!: { id: string; name: string };
  responsibilities!: string[];
  hasAvatar!: boolean;
  hasCv!: boolean;
}
