// Bleeding codes
export type BleedingCode = 'H' | 'M' | 'L' | 'VL' | 'B';

// Mucus stretch codes (numeric descriptors)
export type MucusStretchCode = '0' | '2' | '2W' | '4' | '6' | '8' | '10';

// Mucus characteristic modifiers
export type MucusCharacteristic = 'C' | 'K' | 'L' | 'B' | 'G' | 'Y';

// Observation frequency
export type FrequencyCode = 'x1' | 'x2' | 'x3' | 'AD';

// Stamp types used in Creighton charting
export type StampColor = 'green' | 'red' | 'white' | 'yellow';
export type StampType =
  | 'green'       // Dry / infertile
  | 'greenBaby'   // Potentially fertile but dry
  | 'whiteBaby'   // Fertile (mucus present)
  | 'whiteBabyP'  // Peak day
  | 'whiteBaby1'  // Post-peak count day 1
  | 'whiteBaby2'  // Post-peak count day 2
  | 'whiteBaby3'  // Post-peak count day 3
  | 'greenBaby1'  // Post-peak count day 1 (dry)
  | 'greenBaby2'  // Post-peak count day 2 (dry)
  | 'greenBaby3'  // Post-peak count day 3 (dry)
  | 'red'         // Menstrual bleeding
  | 'yellow'      // Unchanging discharge (BIP)
  | 'yellowBaby'; // Potentially fertile yellow

// A single day's observation
export interface Observation {
  id?: number;
  date: string; // ISO YYYY-MM-DD, unique index
  cycleId?: number;
  bleeding?: BleedingCode;
  mucusStretch?: MucusStretchCode;
  mucusCharacteristics?: MucusCharacteristic[];
  frequency?: FrequencyCode;
  isPeakDay: boolean;
  stampOverride?: StampType; // Manual override
  stamp?: StampType; // Computed
  intercourse?: boolean;
  notes?: string;
}

// A menstrual cycle
export interface Cycle {
  id?: number;
  startDate: string;
  endDate?: string;
  peakDay?: string;
  length?: number;
  notes?: string;
}

// App settings (singleton row)
export interface UserSettings {
  id: number; // Always 1
  bipDescription?: string;
  defaultView: 'chart' | 'calendar';
  reminderTime?: string;
}
