import type { TeamRole } from '../../../common/enums/team-role.enum';
import type { SystemRole } from '../../../common/enums/system-role.enum';

export type AccessTokenPayload = {
  id: string;
  username: string;
  status: string;
  sys_role: SystemRole;
  club_id: string | null;
  mem_role: TeamRole;
};
