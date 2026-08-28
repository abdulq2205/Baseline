/**
 * Plain-English explanation for each of the 22 CSF 2.0 categories.
 *
 * These are the project's own writing, not NIST's. NIST's descriptions are
 * accurate but written for people who already know the framework — "assets are
 * identified and managed consistent with their relative importance to
 * organizational objectives" does not tell a clinic manager what to do on
 * Monday. Each line below answers one question: what would a small organization
 * actually need to be doing here?
 *
 * Rules followed while writing these:
 *   - One sentence, no jargon, no acronyms that are not already common English.
 *   - Concrete and actionable, not a restatement of the NIST wording.
 *   - Written for someone with no security background.
 *
 * Keyed by category ID. The seed checks these against the seeded catalog, so a
 * typo in a key or a missing category fails the seed rather than silently
 * leaving a category unexplained.
 */
export const plainLanguage: Record<string, string> = {
  // ── GOVERN ──
  "GV.OC":
    "Know what your organization does, who depends on you, and which laws or contracts govern the data you hold.",
  "GV.RM":
    "Decide in advance which risks you are willing to live with, so those calls are not made under pressure during a crisis.",
  "GV.RR":
    "Name who is responsible for security, and give them the authority and the time to actually do it.",
  "GV.PO":
    "Write your security rules down, make sure everyone knows them, and enforce them.",
  "GV.OV":
    "Check regularly whether your security efforts are working, and change course when they are not.",
  "GV.SC":
    "Know which vendors, contractors, and software you depend on, and check that their security problems will not become yours.",

  // ── IDENTIFY ──
  "ID.AM":
    "Keep a current list of the devices, accounts, software, and data you have, because you cannot protect what you do not know about.",
  "ID.RA":
    "Work out what could realistically go wrong, how likely it is, and how badly it would hurt.",
  "ID.IM":
    "Learn from incidents, audits, and near misses, and actually fix what they expose.",

  // ── PROTECT ──
  "PR.AA":
    "Give every person their own account, turn on multi-factor authentication, and remove access the day someone leaves.",
  "PR.AT":
    "Teach your staff to spot phishing and handle sensitive data safely, and repeat it rather than doing it once at onboarding.",
  "PR.DS":
    "Protect data where it is stored and while it is being sent, and keep backups you have actually tested restoring.",
  "PR.PS":
    "Keep laptops, servers, and software updated and configured safely, and remove anything you do not need.",
  "PR.IR":
    "Set your systems and network up so that one failure or one compromised machine does not take everything down with it.",

  // ── DETECT ──
  "DE.CM":
    "Watch your systems, accounts, and network for unusual activity instead of waiting for someone else to tell you.",
  "DE.AE":
    "When something looks wrong, look into it and decide whether it is a real security incident or a false alarm.",

  // ── RESPOND ──
  "RS.MA":
    "Have a written plan for who does what when an incident happens, and follow it instead of improvising.",
  "RS.AN":
    "During an incident, work out what actually happened and how far it spread, and preserve the evidence while you do.",
  "RS.CO":
    "Know who you have to tell when something goes wrong -- staff, customers, insurers, regulators -- and how quickly.",
  "RS.MI":
    "Contain the problem fast so it stops spreading, then remove it.",

  // ── RECOVER ──
  "RC.RP":
    "Have a tested plan for restoring systems and data, and know roughly how long it should take.",
  "RC.CO":
    "Keep staff, customers, and partners informed while you are recovering, so they are not left guessing.",
};
