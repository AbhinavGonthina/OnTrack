export type ApplicationStatus =
  | "APPLIED"
  | "OA"
  | "PHONE_SCREEN"
  | "ONSITE_FINAL"
  | "OFFER"
  | "REJECTED";

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
}

export interface MessageResponse {
  message: string;
}

export interface UserResponse {
  id: string;
  email: string;
  resumeText: string | null;
  createdAt: string;
}

export interface ApplicationResponse {
  id: string;
  company: string;
  role: string;
  jobDescriptionText: string | null;
  dateApplied: string;
  currentStatus: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StatusEventResponse {
  id: string;
  status: ApplicationStatus;
  rejectedFromStage: ApplicationStatus | null;
  eventDate: string;
  createdAt: string;
}

export interface NoteResponse {
  id: string;
  text: string;
  createdAt: string;
}

export interface ApplicationDetailResponse extends ApplicationResponse {
  statusEvents: StatusEventResponse[];
  notes: NoteResponse[];
}

export interface FitAnalysisResponse {
  id: string;
  fitScore: number;
  missingKeywords: string[];
  suggestedBullets: string[];
  createdAt: string;
  cached: boolean;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface StatsResponse {
  totalApplications: number;
  responseRate: number;
  oaRate: number;
  onsiteRate: number;
  offerRate: number;
  avgDaysToFirstResponse: number | null;
  sankeyLinks: SankeyLink[];
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
}
