export type Agent = "qa" | "loan" | "tax" | "finder" | "lecture";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageType?: "text" | "report";
  chatId?: string | null;
  reportData?: ReportData;
  createdAt: number;
}

export interface ReportData {
  intro: string;
  danjiInfo: {
    naver_id: number | string;
    danji_name: string;
    total_household_count?: number | null;
    use_approve_ymd?: string | null;
    address?: string | null;
    longitude?: number | null;
    latitude?: number | null;
  };
  priceHistory?: Array<{
    deal_date: string;
    price: number;
    exclusive_area: number;
    floor: number;
  }>;
  listingTrend?: Array<{
    date: string;
    supply_pyeong: number;
    meme_low_20?: number;
    meme_mid_60?: number;
    meme_high_20?: number;
    meme_count?: number;
  }>;
  recentTransactions?: Array<{
    deal_date: string;
    floor: number;
    exclusive_area: number;
    price: number;
  }>;
  locationScore?: {
    location_score?: number;
    location_grade?: string;
    grade_description?: string;
    transport_score?: number;
    school_district_score?: number;
    academy_score?: number;
    job_score?: number;
    commercial_score?: number;
    park_score?: number;
    sgg_percentile?: number;
  };
  schools?: {
    elementary?: Array<{ name: string; distance?: number }>;
    middle?: Array<{ name: string; distance?: number; tmg_rate?: number }>;
  };
  currentListings?: {
    total: number;
    byArea?: Array<{ area: string; count: number }>;
    naverUrl?: string;
  };
  review?: {
    oneLiner: string;
    strengths: string[];
    weaknesses: string[];
  };
  similarComplexes?: Array<{
    danji_name: string;
    avg_price: number;
    trade_count: number;
  }>;
  suggestedQuestions?: Array<{
    label: string;
    action: "followup" | "switch_agent";
    target?: Agent;
    text?: string;
  }>;
}

export interface ChatResponseText {
  messageType: "text";
  chatId: string | null;
  content: string;
}

export interface ChatResponseReport {
  messageType: "report";
  chatId: string | null;
  data: ReportData;
}

export type ChatResponse = ChatResponseText | ChatResponseReport;
