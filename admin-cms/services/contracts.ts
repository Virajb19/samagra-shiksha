import { School, Subject, User } from "@/types";

export interface UserFilterParams {
  page?: number;
  limit?: number;
  role?: string;
  roles?: string[];
  district_id?: string;
  school_id?: string;
  search?: string;
  is_active?: boolean;
  exclude_roles?: string[];

  sort_order?: "asc" | "desc";
}

export interface PaginatedUsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedSchoolsResponse {
  data: School[];
  total: number;
  hasMore: boolean;
}

export interface CreateSchoolInput {
  name: string;
  registration_code: string;
  district_id: string;
}

export interface UpdateSchoolInput {
  name?: string;
  registration_code?: string;
  district_id?: string;
}

export interface UpdateSubjectInput {
  name?: string;
  class_level?: number;
  is_active?: boolean;
}

export interface SubjectBulkResult {
  created: Subject[];
  errors: string[];
}
