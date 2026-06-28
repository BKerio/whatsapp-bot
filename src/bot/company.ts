import type { ListRow } from "@/whatsapp/types";

export const COMPANY_PROFILE_FILENAME = "Millenium Solutions_Business Profile.pdf";

export const COMPANY = {
  name: "Millenium Solutions EA Ltd",
  tagline: "Your Technology Partner",
  email: "info@millenium.co.ke",
  phone: "+254716774477",
  address: "Manga House - Ground Floor Wing B, 5 Kiambere Road, Upper Hill, Nairobi, Kenya",
  website: "https://www.millenium.co.ke",
  hours: "Monday–Friday, 8:00am–5:00pm EAT",
};

export const SERVICE_CATALOG: ListRow[] = [
  {
    id: "svc_software",
    title: "Software & Databases",
    description: "Custom apps and database solutions",
  },
  {
    id: "svc_infrastructure",
    title: "IT Infrastructure",
    description: "Compute, storage and hardware",
  },
  {
    id: "svc_networking",
    title: "Networking",
    description: "WAN/LAN and connectivity solutions",
  },
  {
    id: "svc_security",
    title: "Cybersecurity",
    description: "Threat protection and data safety",
  },
  {
    id: "svc_erp",
    title: "ERP Solutions",
    description: "SAP, Microsoft Navision and more",
  },
  {
    id: "svc_iot",
    title: "IoT & Smart Solutions",
    description: "IoT and smart eCooking platform",
  },
  {
    id: "svc_drone",
    title: "Drone Mapping",
    description: "Aerial surveying and geospatial data",
  },
  {
    id: "svc_towers",
    title: "Comm Towers",
    description: "Tower construction and network infra",
  },
  {
    id: "main_menu",
    title: "Main Menu",
    description: "Return to support menu",
  },
];

export const SERVICE_DETAILS: Record<string, string> = {
  svc_software:
    "💻 *Applications, Databases & Software Development*\n\n" +
    "We engineer bespoke applications and databases tailored to your business - from AI-driven analytics to mission-critical systems with seamless scalability.",
  svc_infrastructure:
    "🖥️ *Software & Hardware Infrastructure*\n\n" +
    "High-availability compute and storage platforms designed for 99.999% uptime, enterprise-grade redundancy, and fearless scaling.",
  svc_networking:
    "🌐 *Networking Solutions*\n\n" +
    "Hybrid WAN/LAN architectures, secure remote access, and real-time traffic optimization for local and global teams.",
  svc_security:
    "🔒 *Cyber Security & Data Loss Prevention*\n\n" +
    "Zero-trust architecture, advanced threat intelligence, and robust data protection aligned with global compliance standards.",
  svc_erp:
    "📊 *Enterprise Resource Planning*\n\n" +
    "ERP implementation and support across Microsoft, SAP and more - streamlining operations and automating business processes.",
  svc_iot:
    "📡 *IoT Solutions & Smart eCooking*\n\n" +
    "Connected device platforms and smart solutions that turn operational data into actionable intelligence.",
  svc_drone:
    "🛸 *Drone Mapping & Surveying*\n\n" +
    "High-resolution aerial imagery, 3D terrain modelling, and centimetre-accurate GPS mapping for construction and environmental projects.",
  svc_towers:
    "📶 *Communication Tower Solutions*\n\n" +
    "End-to-end tower construction, antenna installation, RF cabling, and compliant network infrastructure for telecom operators.",
};

export const PAYMENT_CATEGORIES: ListRow[] = [
  {
    id: "pay_software",
    title: "Software Dev",
    description: "Applications and database work",
  },
  {
    id: "pay_support",
    title: "IT Support",
    description: "Support and maintenance services",
  },
  {
    id: "pay_infrastructure",
    title: "Infrastructure",
    description: "Hardware and cloud services",
  },
  {
    id: "pay_consultancy",
    title: "Consultancy",
    description: "IT advisory and consultancy",
  },
  {
    id: "pay_other",
    title: "Other Payment",
    description: "General service payment",
  },
  {
    id: "main_menu",
    title: "Main Menu",
    description: "Go back to support menu",
  },
];

export const PAYMENT_LABELS: Record<string, string> = {
  pay_software: "Software Development",
  pay_support: "IT Support",
  pay_infrastructure: "Infrastructure",
  pay_consultancy: "Consultancy",
  pay_other: "Service Payment",
};

export const SUPPORT_CATEGORIES: ListRow[] = [
  { id: "sup_software", title: "Software Issue", description: "Apps, databases, integrations" },
  { id: "sup_network", title: "Network Issue", description: "Connectivity and access problems" },
  { id: "sup_security", title: "Security Issue", description: "Threats, access, data concerns" },
  { id: "sup_billing", title: "Billing & Payment", description: "Invoices and M-Pesa payments" },
  { id: "sup_general", title: "General Inquiry", description: "Other support requests" },
  { id: "main_menu", title: "Main Menu", description: "Return to support menu" },
];

export const SUPPORT_LABELS: Record<string, string> = {
  sup_software: "Software & Applications",
  sup_network: "Networking",
  sup_security: "Cybersecurity",
  sup_billing: "Billing & Payment",
  sup_general: "General Inquiry",
};

export interface TeamMember {
  name: string;
  role: string;
}

export const TEAM_DEPARTMENTS: ListRow[] = [
  { id: "team_leadership", title: "Leadership", description: "Strategy, commercial & management" },
  { id: "team_engineering", title: "Engineering", description: "Software and systems engineers" },
  { id: "team_specialists", title: "Specialists", description: "Finance, BD, cyber security" },
  { id: "team_all", title: "View All Team", description: "Full team directory" },
  { id: "main_menu", title: "Main Menu", description: "Return to support menu" },
];

export const TEAM_BY_DEPARTMENT: Record<string, TeamMember[]> = {
  team_leadership: [
    { name: "Evans Yegon", role: "Strategy Lead" },
    { name: "Marlon Lugadiru", role: "Chief Commercial Officer" },
    { name: "Collins Langat", role: "Chief Technology Officer" },
    { name: "Rose Kirwa", role: "Human Resource Officer" },
    { name: "Burton Makelo", role: "Project Manager" },
  ],
  team_engineering: [
    { name: "Clinton Kiptoo", role: "Engineering Lead" },
    { name: "Erickson Kimtai", role: "Network/Embedded Systems/Software Engineering" },
    { name: "Eliud Mugu", role: "DevOps Engineer" },
    { name: "Caleb Salat", role: "Software Developer" },
    { name: "Emmanuel Lugadilu", role: "Software Developer" },
    { name: "Dalton", role: "Internship" },
    { name: "Brian Kerio", role: "Problem Solver" },
  ],
  team_specialists: [
    { name: "Ivy Kirui", role: "Finance Officer" },
    { name: "Linet Ngari", role: "Business Developer/Data Analyst" },
    { name: "Frank Tito", role: "Cyber Security Lead" },
  ],
};

export function formatTeamList(title: string, members: TeamMember[]): string {
  const lines = members.map((m) => `• *${m.name}* - ${m.role}`);
  return `👥 *${title}*\n\n${lines.join("\n")}`;
}

export function formatFullTeamDirectory(): string[] {
  const allMembers = [
    ...TEAM_BY_DEPARTMENT.team_leadership,
    ...TEAM_BY_DEPARTMENT.team_engineering,
    ...TEAM_BY_DEPARTMENT.team_specialists,
  ];

  return [
    formatTeamList("Leadership", TEAM_BY_DEPARTMENT.team_leadership),
    formatTeamList("Engineering", TEAM_BY_DEPARTMENT.team_engineering),
    formatTeamList("Specialists", TEAM_BY_DEPARTMENT.team_specialists),
    `📊 *Team Summary*\n\nTotal team members: *${allMembers.length}*`,
  ];
}

export const TEAM_DEPARTMENT_TITLES: Record<string, string> = {
  team_leadership: "Leadership",
  team_engineering: "Engineering",
  team_specialists: "Specialists",
};