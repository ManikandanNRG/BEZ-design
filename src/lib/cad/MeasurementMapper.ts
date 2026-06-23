/**
 * MeasurementMapper.ts
 *
 * Robustly parses factory tech pack measurement sheets.
 * Resolves naming aliases, handles fraction parsing (e.g. "1 1/2"),
 * automatically detects inches vs CM based on length values,
 * and normalizes circumferences (e.g., dividing "chest circumference" by 2).
 * 
 * Outputs a clean dictionary of CAD variables in 1:1 millimeters.
 */

export class MeasurementMapper {
  static extract(meas: any[], sizeKey: string): { vars: Record<string, number>, isCm: boolean, scale: number } {
    if (!meas || meas.length === 0) {
      // Default dummy values in MM if no data provided
      return {
        isCm: false,
        scale: 25.4,
        vars: this.getDefaultsInMm()
      };
    }

    // 1. First, find a major length dimension to determine CM vs INCHES
    const rawLength = this.findRawValue(meas, sizeKey, ['length', 'hsp', 'center back length', 'body length']);
    const isCm: boolean = !!rawLength && rawLength > 50; // If a length is > 50, it's almost certainly CM.
    const scale = isCm ? 10 : 25.4; // Internal CAD unit is millimeters (1:1)

    // Helper to get exactly what the CAD kernel needs
    const get = (aliases: string[], fallbackRaw: number, isHalfCircumferenceExpected: boolean = false): number => {
      const val = this.findRawValue(meas, sizeKey, aliases);
      if (val !== null) {
        // If we expect a half-circumference but the wording implies full circumference, divide by 2.
        const foundDesc = this.findDescription(meas, aliases).toLowerCase();
        const impliesFull = foundDesc.includes('circumference') || foundDesc.includes('all round') || foundDesc.includes('circ');
        
        // Also guess based on size if it's ridiculously large
        const isSuspiciouslyLarge = (aliases.includes('chest') && val > 30 && !isCm) || (aliases.includes('chest') && val > 75 && isCm);

        let finalRaw = val;
        if (isHalfCircumferenceExpected && (impliesFull || isSuspiciouslyLarge)) {
          finalRaw = finalRaw / 2;
        }

        return finalRaw * scale;
      }
      return fallbackRaw * scale;
    };

    // 2. Extract exactly the variables CADKernel needs
    const bodyLength = get(['length', 'hsp', 'center back length', 'body length'], isCm ? 70 : 28);
    
    // Chest
    const halfChest = get(['chest', 'bust', '1/2 chest', 'across chest', 'chest width', 'pit to pit'], isCm ? 50 : 20, true);
    
    // Bottom / Hem
    const halfHem = get(['sweep', 'hem', 'bottom', 'rib opening', 'waist'], isCm ? 50 : 20, true);

    // Shoulder
    const halfShoulder = get(['shoulder width', 'across shoulder', 'shoulder to shoulder', 'shoulder span'], isCm ? 44 : 17, true);
    const shoulderSlope = get(['shoulder slope', 'shoulder drop'], isCm ? 4.5 : 1.75);
    const shoulderLength = get(['shoulder length', 'shoulder seam'], isCm ? 15 : 6);

    // Across Front / Back
    const acrossFront = get(['across front', 'cross front', 'x-front', 'front width'], isCm ? 36 : 14.62, true);
    const acrossBack = get(['across back', 'cross back', 'x-back', 'back width'], isCm ? 38 : 15.38, true);

    // Neck
    const halfNeck = get(['neck width', 'neck opening', 'collar width', 'neck circ'], isCm ? 18 : 7.5, true);
    const frontNeckDrop = get(['front neck drop', 'fnd'], isCm ? 11 : 4.5);
    const backNeckDrop = get(['back neck drop', 'bnd'], isCm ? 1.5 : 0.5);

    // Armhole
    const armholeCirc = get(['armhole curve', 'armhole circumference', 'scye'], isCm ? 50 : 20, true);
    const armholeStraight = get(['armhole straight', 'armhole depth'], isCm ? 22 : 8.5);

    // Sleeve
    const sleeveLength = get(['sleeve length', 'slv len', 'cb sleeve'], isCm ? 65 : 25.5);
    const halfBicep = get(['bicep', 'muscle', 'sleeve width', 'upper arm'], isCm ? 18 : 7.25, true);
    const halfWrist = get(['sleeve opening', 'cuff', 'wrist'], isCm ? 9 : 4.25, true);
    const sleeveCap = get(['sleeve cap', 'crown height', 'cap height'], isCm ? 12 : 4.5);

    // Hood
    const hoodHeight = get(['hood height', 'hood length'], isCm ? 36 : 14);
    const hoodDepth = get(['hood width', 'hood depth'], isCm ? 26 : 10);

    return {
      isCm,
      scale,
      vars: {
        bodyLength,
        halfChest,
        halfHem,
        halfShoulder,
        shoulderSlope,
        shoulderLength,
        acrossFront,
        acrossBack,
        halfNeck,
        frontNeckDrop,
        backNeckDrop,
        armholeCirc,
        armholeStraight,
        sleeveLength,
        halfBicep,
        halfWrist,
        sleeveCap,
        hoodHeight,
        hoodDepth
      }
    };
  }

  private static findRawValue(meas: any[], sizeKey: string, aliases: string[]): number | null {
    const item = meas.find(m => {
      const desc = (m.description || '').toLowerCase();
      // Only exact word matches or contains alias
      return aliases.some(alias => {
        // Simple regex to match exact phrases (e.g. "chest" but not "chestnut")
        const regex = new RegExp(`\\b${alias.replace(/\//g, '\\/')}\\b`, 'i');
        return regex.test(desc);
      });
    });

    if (!item) return null;

    const valToParse = sizeKey ? item[sizeKey] : (item.m || item.value || item.s || item.l);
    if (valToParse === undefined || valToParse === null) return null;

    return this.parseNumericString(String(valToParse));
  }

  private static findDescription(meas: any[], aliases: string[]): string {
    const item = meas.find(m => {
      const desc = (m.description || '').toLowerCase();
      return aliases.some(alias => {
        const regex = new RegExp(`\\b${alias.replace(/\//g, '\\/')}\\b`, 'i');
        return regex.test(desc);
      });
    });
    return item ? (item.description || '') : '';
  }

  private static parseNumericString(valStr: string): number | null {
    valStr = valStr.trim();
    if (valStr === '') return null;

    let val = 0;
    // Handle "5 1/2"
    if (valStr.includes(' ')) {
      const parts = valStr.split(' ');
      if (parts.length === 2 && parts[1].includes('/')) {
        val += parseFloat(parts[0]);
        valStr = parts[1];
      }
    }
    // Handle fractions "1/2"
    if (valStr.includes('/')) {
      const parts = valStr.split('/');
      val += parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
      // Handle "5.5" or "5.5cm"
      const match = valStr.match(/(\d+(\.\d+)?)/);
      if (match) val += parseFloat(match[1]);
    }

    return val > 0 ? val : null;
  }

  private static getDefaultsInMm(): Record<string, number> {
    const s = 25.4;
    return {
      bodyLength: 28 * s,
      halfChest: 20 * s,
      halfHem: 20 * s,
      halfShoulder: 17 * s,
      shoulderSlope: 1.75 * s,
      shoulderLength: 6 * s,
      acrossFront: 14.62 * s,
      acrossBack: 15.38 * s,
      halfNeck: 7.5 * s,
      frontNeckDrop: 4.5 * s,
      backNeckDrop: 0.5 * s,
      armholeCirc: 9.5 * s,
      armholeStraight: 8.5 * s,
      sleeveLength: 25.5 * s,
      halfBicep: 7.25 * s,
      halfWrist: 4.25 * s,
      sleeveCap: 4.5 * s,
      hoodHeight: 14 * s,
      hoodDepth: 10 * s
    };
  }
}
