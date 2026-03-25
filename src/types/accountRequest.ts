export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestRole   = 'student' | 'leader';

export interface AccountRequest {
  id: string;
  full_name: string;
  email: string;
  role: RequestRole;
  message: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface AccountRequestFormValues {
  full_name: string;
  email: string;
  role: RequestRole;
  message: string | null;
}