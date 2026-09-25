import { IsUUID } from 'class-validator';

export class CreateInviteDto {
  @IsUUID()
  familyId: string;
}
