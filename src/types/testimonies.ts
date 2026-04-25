export type TestimonyStatus = 'pending' | 'published' | 'approved' | 'declined' | 'retracted';
export type ReactionType = 'amen' | 'touched' | 'inspiring';

export interface TestimonyCategory {
  id: string;
  tenant_id: string;
  label: string;
  color: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Testimony {
  id: string;
  tenant_id: string;
  member_id: string | null;
  title: string;
  body: string;
  category: string | null;
  category_id: string | null;
  is_anonymous: boolean;
  is_approved: boolean;
  approved_by: string | null;
  status: TestimonyStatus;
  author_name: string | null;
  date_of_testimony: string | null;
  allow_featuring: boolean;
  is_featured: boolean;
  view_count: number;
  submitted_by_member_id: string | null;
  submitted_by_admin_id: string | null;
  testimony_date: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TestimonyReaction {
  id: string;
  tenant_id: string;
  testimony_id: string;
  member_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface TestimonyWithRelations extends Testimony {
  testimony_categories?: Pick<TestimonyCategory, 'label' | 'color'> | null;
  testimony_reactions?: TestimonyReaction[];
  members?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
}

export interface ReactionCounts {
  amen: number;
  touched: number;
  inspiring: number;
}
