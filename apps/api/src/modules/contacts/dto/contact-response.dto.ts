export class ContactResponseDto {
  id!: string;
  name!: string;
  responsibility!: string;
  groupLabel!: string;
  address!: string;
  phone!: string;
  email!: string;
  description!: string;
  kind!: 'INTERNAL' | 'EXTERNAL';
}
