/** Fixture minimal CALCULATION rows — ELB hardware screw */
const row = [];
row[3] = 'HARDWARE';
row[7] = '005-016-002-008';
row[11] = 'SCREW TEST';
row[15] = 1;
row[19] = 1500;

export const CALCULATION_FIXTURE_ROWS = Array.from({ length: 12 }, (_, i) => (i === 9 ? row : []));

export const CALCULATION_FIXTURE_SCREW_KODE = '005-016-002-008';
