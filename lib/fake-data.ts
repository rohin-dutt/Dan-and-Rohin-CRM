export type Person = {
  id: string;
  name: string;
  company: string;
  role: string;
  relationshipType: string;
  relationshipStrength: "New" | "Developing" | "Strong" | "Trusted";
  preferredContactMethod: string;
  location: string;
  lastContacted: string;
  contactFrequencyDays: number;
  notes: string;
  howMet: string;
};

export type Interaction = {
  id: string;
  personId: string;
  type: string;
  date: string;
  notes: string;
};

export const people: Person[] = [
  {
    id: "maya-patel",
    name: "Maya Patel",
    company: "Northstar Design",
    role: "Product Designer",
    relationshipType: "Former coworker",
    relationshipStrength: "Strong",
    preferredContactMethod: "Text",
    location: "Chicago, IL",
    lastContacted: "2026-04-18",
    contactFrequencyDays: 21,
    notes:
      "Great design partner. Usually has practical feedback on early product ideas.",
    howMet: "Worked together on the account settings redesign at a past job.",
  },
  {
    id: "jordan-lee",
    name: "Jordan Lee",
    company: "Brightline Labs",
    role: "Engineering Manager",
    relationshipType: "Mentor",
    relationshipStrength: "Trusted",
    preferredContactMethod: "Email",
    location: "Austin, TX",
    lastContacted: "2026-04-08",
    contactFrequencyDays: 30,
    notes:
      "Good person to ask about team structure, hiring loops, and technical planning.",
    howMet: "Met through a local engineering leadership meetup.",
  },
  {
    id: "sofia-martinez",
    name: "Sofia Martinez",
    company: "Cedar Health",
    role: "Operations Lead",
    relationshipType: "Friend",
    relationshipStrength: "Strong",
    preferredContactMethod: "Phone",
    location: "Denver, CO",
    lastContacted: "2026-05-02",
    contactFrequencyDays: 14,
    notes:
      "Often shares useful ideas about keeping systems simple as teams grow.",
    howMet: "Introduced by a mutual friend during a weekend trip.",
  },
  {
    id: "ethan-brooks",
    name: "Ethan Brooks",
    company: "Summit Capital",
    role: "Investor",
    relationshipType: "Professional contact",
    relationshipStrength: "Developing",
    preferredContactMethod: "LinkedIn",
    location: "New York, NY",
    lastContacted: "2026-03-27",
    contactFrequencyDays: 45,
    notes:
      "Interested in productivity tools and small business software. Keep updates concise.",
    howMet: "Met after a conference panel on founder-led software companies.",
  },
  {
    id: "nina-williams",
    name: "Nina Williams",
    company: "Evergreen Studio",
    role: "Brand Strategist",
    relationshipType: "Collaborator",
    relationshipStrength: "New",
    preferredContactMethod: "Coffee chat",
    location: "Portland, OR",
    lastContacted: "2026-05-05",
    contactFrequencyDays: 20,
    notes:
      "New connection with sharp thoughts on positioning and launch messaging.",
    howMet: "Met during a client discovery workshop.",
  },
  {
    id: "owen-chen",
    name: "Owen Chen",
    company: "Forge Systems",
    role: "Staff Engineer",
    relationshipType: "Peer",
    relationshipStrength: "Developing",
    preferredContactMethod: "Slack",
    location: "Seattle, WA",
    lastContacted: "2026-04-29",
    contactFrequencyDays: 14,
    notes:
      "Enjoys digging into architecture tradeoffs and usually has good reading recommendations.",
    howMet: "Paired on an open source issue in a developer tools project.",
  },
];

export const interactions: Interaction[] = [
  {
    id: "int-001",
    personId: "maya-patel",
    type: "Text",
    date: "2026-04-18",
    notes: "Checked in about her new role and traded notes on design systems.",
  },
  {
    id: "int-002",
    personId: "maya-patel",
    type: "Coffee",
    date: "2026-03-24",
    notes: "Caught up downtown and discussed a possible portfolio review.",
  },
  {
    id: "int-003",
    personId: "jordan-lee",
    type: "Email",
    date: "2026-04-08",
    notes: "Asked for feedback on a lightweight roadmap format.",
  },
  {
    id: "int-004",
    personId: "jordan-lee",
    type: "Video call",
    date: "2026-02-28",
    notes: "Talked through interview process design and management habits.",
  },
  {
    id: "int-005",
    personId: "sofia-martinez",
    type: "Phone",
    date: "2026-05-02",
    notes: "Planned a catch-up and heard about her team operations project.",
  },
  {
    id: "int-006",
    personId: "ethan-brooks",
    type: "LinkedIn",
    date: "2026-03-27",
    notes: "Sent a short update after the conference conversation.",
  },
  {
    id: "int-007",
    personId: "nina-williams",
    type: "Coffee",
    date: "2026-05-05",
    notes: "Debriefed the workshop and discussed positioning for solo founders.",
  },
  {
    id: "int-008",
    personId: "owen-chen",
    type: "Slack",
    date: "2026-04-29",
    notes: "Shared a note about local-first app architecture.",
  },
  {
    id: "int-009",
    personId: "owen-chen",
    type: "Video call",
    date: "2026-04-12",
    notes: "Reviewed tradeoffs between simple files and a hosted database.",
  },
];

export function getPersonById(id: string) {
  return people.find((person) => person.id === id);
}

export function getInteractionsForPerson(personId: string) {
  return interactions
    .filter((interaction) => interaction.personId === personId)
    .sort((a, b) => b.date.localeCompare(a.date));
}
