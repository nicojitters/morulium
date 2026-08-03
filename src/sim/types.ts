export type Stat = 'PWR' | 'VIT' | 'SPD' | 'INT' | 'GUI';
export const STATS: readonly Stat[] = ['PWR', 'VIT', 'SPD', 'INT', 'GUI'] as const;

export type Tier = 'Basic' | 'Variant' | 'Adapted' | 'Evolved' | 'Apex';

export type Dominance = 'dominant' | 'recessive';
export type LocusType = 'quantitative' | 'qualitative';

export type RarityWeight = 0 | 1 | 3 | 6 | 10;

export interface Allele {
  readonly id: string;
  readonly locus: string;
  readonly label: string;
  readonly rarityWeight: RarityWeight;
  readonly drawWeight: number;
  readonly statDeltas: Readonly<Partial<Record<Stat, number>>>;
  readonly ability?: string;
  readonly dominance?: Dominance;
}

export interface Locus {
  readonly id: string;
  readonly type: LocusType;
  readonly alleles: readonly string[];
}

export interface Genome {
  readonly loci: Readonly<Record<string, readonly [string, string]>>;
}

export interface PhenotypeDescriptor {
  readonly expressed: Readonly<Record<string, string>>;
  readonly palette: string;
}

export interface Palette {
  readonly id: string;
  readonly ramp: readonly string[];
}
