export type RoomRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Room {
  id: string;
  project_id: string;
  name: string;
  purpose: string | null;
  settings: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  role: RoomRole;
  joined_at: string;
}

export interface PersonProfileFacet {
  items: string[];
  visibility: 'invisible' | 'room-only' | 'group-only' | 'public';
}

export interface PersonProfile {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  headline: string | null;
  data_json: Record<string, PersonProfileFacet>;
  created_at: string;
}

export interface ProblemSubmission {
  id: string;
  room_id: string;
  author_id: string;
  version: number;
  content_json: Record<string, unknown>;
  evidence_json: Array<{ url: string; note?: string }>;
  anonymity: boolean;
  state: 'draft' | 'submitted' | 'locked';
  created_at: string;
}
