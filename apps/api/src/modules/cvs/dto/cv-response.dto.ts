export class CvResponseDto {
  template!: 'Tily' | 'Mpanazava' | null;
  firstName!: string;
  lastName!: string;
  address!: string;
  birthDate!: Date;
  birthPlace!: string | null;
  phone!: string;
  email!: string;
  facebook!: string | null;
  province!: string;
  area!: string;
  fivondronana!: string;
  extraPersonal!: Array<{ label: string; value: string }>;
  extraContact!: Array<{ label: string; value: string }>;
  branches!: Array<{
    name: string;
    group: string;
    project: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }>;
  activities!: Array<{
    name: string | null;
    responsibility: string | null;
    description: string | null;
    date: Date | null;
  }>;
}
