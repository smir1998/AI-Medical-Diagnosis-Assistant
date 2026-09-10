/* ------------------------------------------------------------------ */
/*  Encounter history — ties every lab run to the patient on chart     */
/*  at the time of analysis, so the registrar shows a longitudinal     */
/*  trail per MRN.                                                     */
/* ------------------------------------------------------------------ */

export interface EncounterEntry {
  id: number;
  time: string;
  type: "symptom" | "image" | "derm" | "adm";
  title: string;
  confidence: number;
  mrn?: string;
}

/** All entries recorded while `mrn` was the active chart (admissions included). */
export function encountersFor(history: EncounterEntry[], mrn: string): EncounterEntry[] {
  return history.filter((h) => h.mrn === mrn);
}

export const ENCOUNTER_TYPE_LABEL: Record<EncounterEntry["type"], string> = {
  symptom: "SYMPTOM LAB",
  image: "RADIOLOGY",
  derm: "DERM SCAN",
  adm: "ADMISSION",
};
