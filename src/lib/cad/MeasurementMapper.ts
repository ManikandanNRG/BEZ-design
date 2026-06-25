/**
 * MeasurementMapper.ts
 *
 * Robustly parses factory tech pack measurement sheets.
 * Resolves naming aliases, handles fraction parsing (e.g. "1 1/2"),
 * automatically detects inches vs CM based on length values,
 * and normalizes dimensions (e.g., dividing chest circumference by 4 to get 1/4 center-to-side flat width).
 * 
 * Outputs a clean dictionary of CAD variables in 1:1 millimeters.
 */

export class MeasurementMapper {
  static extract(meas: any[], sizeKey: string): { vars: Record<string, number>, isCm: boolean, scale: number } {
    if (!meas || meas.length === 0) {
      return {
        isCm: false,
        scale: 25.4,
        vars: this.getDefaultsInMm()
      };
    }

    // 1. First, find a major length dimension to determine CM vs INCHES
    const rawLength = this.findRawValue(meas, sizeKey, ['length', 'hsp', 'center back length', 'body length'], ['sleeve', 'shoulder', 'cuff', 'pocket', 'collar', 'neck', 'drop', 'opening', 'bicep', 'hood']);
    const isCm: boolean = !!rawLength && rawLength > 50; // If a length is > 50, it's almost certainly CM.
    const scale = isCm ? 10 : 25.4; // Internal CAD unit is millimeters (1:1)

    // Helper to get exactly what the CAD kernel needs
    const get = (
      aliases: string[], 
      fallbackRaw: number, 
      rejects: string[] = [], 
      divisionRule: 'none' | 'half' | 'circumference' = 'none'
    ): number => {
      const val = this.findRawValue(meas, sizeKey, aliases, rejects);
      if (val !== null) {
        let finalRaw = val;
        
        if (divisionRule === 'half') {
          // Shoulder, Neck, Across Front/Back: always flat seam-to-seam, divide by 2 for center-to-side
          finalRaw = finalRaw / 2;
        } else if (divisionRule === 'circumference') {
          // Chest & Hem: If raw value is a circumference (e.g. chest > 30" or > 75cm), we need 1/4 of it for the pattern piece.
          // If raw value is already flat (e.g. chest <= 30" or <= 75cm), we need 1/2 of it.
          const isCircumference = (val > 30 && !isCm) || (val > 75 && isCm);
          if (isCircumference) {
            finalRaw = finalRaw / 4;
          } else {
            finalRaw = finalRaw / 2;
          }
        } else if (divisionRule === 'none') {
          // Bicep & Sleeve Opening (Wrist) are flat widths in the CAD piece, but they might be listed as circumferences in the spec sheet.
          // If circumference, divide by 2 to get flat. Otherwise keep.
          const isBicepOrWristCirc = (aliases.includes('bicep') && ((val > 10 && !isCm) || (val > 25 && isCm))) ||
                                     ((aliases.includes('sleeve opening') || aliases.includes('cuff') || aliases.includes('wrist')) && ((val > 6 && !isCm) || (val > 15 && isCm)));
          if (isBicepOrWristCirc) {
            finalRaw = finalRaw / 2;
          }
        }

        return finalRaw * scale;
      }
      let finalFallback = fallbackRaw;
      if (divisionRule === 'half') {
        finalFallback = finalFallback / 2;
      } else if (divisionRule === 'circumference') {
        const isCircumference = (fallbackRaw > 30 && !isCm) || (fallbackRaw > 75 && isCm);
        if (isCircumference) {
          finalFallback = finalFallback / 4;
        } else {
          finalFallback = finalFallback / 2;
        }
      }
      return finalFallback * scale;
    };

    // 2. Extract exactly the variables CADKernel needs
    const bodyLength = get(['length', 'hsp', 'center back length', 'body length'], isCm ? 70 : 28, ['sleeve', 'shoulder', 'cuff', 'pocket', 'collar', 'neck', 'drop', 'opening', 'bicep', 'hood'], 'none');
    
    // Chest (expects 1/4 of full circumference, or 1/2 of flat width)
    const halfChest = get(['chest', 'bust', '1/2 chest', 'across chest', 'chest width', 'pit to pit'], isCm ? 50 : 20, ['neck', 'shoulder', 'sleeve', 'cuff', 'hem', 'bottom', 'sweep', 'collar', 'pocket', 'opening', 'drop', 'back', 'front'], 'circumference');
    
    // Bottom / Hem (expects 1/4 of full sweep, or 1/2 of flat sweep)
    const halfHem = get(['sweep', 'hem', 'bottom', 'rib opening', 'waist'], isCm ? 50 : 20, ['neck', 'shoulder', 'sleeve', 'chest', 'collar', 'pocket'], 'circumference');

    // Shoulder (expects 1/2 of seam-to-seam width)
    const halfShoulder = get(['shoulder width', 'across shoulder', 'shoulder to shoulder', 'shoulder span'], isCm ? 44 : 17, ['slope', 'angle', 'drop', 'neck', 'seam length', 'sleeve'], 'half');
    const shoulderSlope = get(['shoulder slope', 'shoulder drop'], isCm ? 4.5 : 1.75, [], 'none');
    const shoulderLength = get(['shoulder length', 'shoulder seam'], isCm ? 15 : 6, [], 'none');

    // Across Front / Back (expects 1/2 of seam-to-seam width)
    const acrossFront = get(['across front', 'cross front', 'x-front', 'front width'], isCm ? 36 : 14.62, ['neck', 'shoulder', 'sleeve', 'chest', 'back'], 'half');
    const acrossBack = get(['across back', 'cross back', 'x-back', 'back width'], isCm ? 38 : 15.38, ['neck', 'shoulder', 'sleeve', 'chest', 'front'], 'half');

    // Neck (expects 1/2 of neck opening width)
    const halfNeck = get(['neck width', 'neck opening', 'collar width', 'neck circ'], isCm ? 18 : 7.5, ['drop', 'height', 'depth', 'shoulder', 'chest'], 'half');
    const frontNeckDrop = get(['front neck drop', 'fnd'], isCm ? 11 : 4.5, [], 'none');
    const backNeckDrop = get(['back neck drop', 'bnd'], isCm ? 1.5 : 0.5, [], 'none');

    // Armhole
    const armholeCirc = get(['armhole curve', 'armhole circumference', 'scye'], isCm ? 50 : 20, [], 'half');
    const armholeStraight = get(['armhole straight', 'armhole depth'], isCm ? 22 : 8.5, [], 'none');

    // Sleeve (expects flat sleeve bicep/wrist widths)
    const sleeveLength = get(['sleeve length', 'slv len', 'cb sleeve'], isCm ? 65 : 25.5, ['opening', 'open', 'cuff', 'wrist', 'width', 'bicep', 'biceps', 'muscle'], 'none');
    const halfBicep = get(['bicep', 'muscle', 'sleeve width', 'upper arm'], isCm ? 18 : 7.25, ['length', 'chest', 'shoulder', 'open', 'opening'], 'none');
    const halfWrist = get(['sleeve opening', 'cuff', 'wrist', 'sleeve open'], isCm ? 9 : 4.25, ['length', 'chest', 'shoulder', 'bicep'], 'none');
    const sleeveCap = get(['sleeve cap', 'crown height', 'cap height'], isCm ? 12 : 4.5, [], 'none');

    // Elbow and Forearm variables
    const elbowPosition = get(['elbow position', 'elbow position from shoulder seam'], isCm ? 35 : 14, [], 'none');
    const halfElbow = get(['elbow width', 'elbow width all round', 'elbow girth'], isCm ? 15 : 5.875, [], 'half');
    const forearmPosition = get(['forearm position', 'forearm position from shoulder seam'], isCm ? 50 : 20, [], 'none');
    const halfForearm = get(['forearm width', 'forearm width all round', 'forearm girth'], isCm ? 13 : 5.0, [], 'half');

    // Full circumferences for labels
    const bicepCirc = halfBicep * 2;
    const wristCirc = halfWrist * 2;
    const elbowCirc = halfElbow * 2;
    const forearmCirc = halfForearm * 2;

    // Hood
    const hoodHeight = get(['hood height', 'hood length'], isCm ? 36 : 14, [], 'none');
    const hoodDepth = get(['hood width', 'hood depth'], isCm ? 26 : 10, [], 'none');

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
        elbowPosition,
        halfElbow,
        forearmPosition,
        halfForearm,
        bicepCirc,
        wristCirc,
        elbowCirc,
        forearmCirc,
        hoodHeight,
        hoodDepth
      }
    };
  }

  private static findRawValue(meas: any[], sizeKey: string, aliases: string[], rejects: string[] = []): number | null {
    const item = meas.find(m => {
      const desc = (m.description || '').toLowerCase();
      // If desc contains any reject keyword, skip this row
      if (rejects.some(r => desc.includes(r))) return false;

      // Only exact word matches or contains alias
      return aliases.some(alias => {
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
      halfChest: 10 * s, // 1/4 of 40" chest circumference
      halfHem: 10 * s,
      halfShoulder: 8.5 * s, // 1/2 of 17" shoulder width
      shoulderSlope: 1.75 * s,
      shoulderLength: 6 * s,
      acrossFront: 7.31 * s, // 1/2 of 14.62"
      acrossBack: 7.69 * s, // 1/2 of 15.38"
      halfNeck: 3.75 * s, // 1/2 of 7.5"
      frontNeckDrop: 4.5 * s,
      backNeckDrop: 0.5 * s,
      armholeCirc: 9.5 * s,
      armholeStraight: 8.5 * s,
      sleeveLength: 25.5 * s,
      halfBicep: 7.25 * s, // Flat bicep width
      halfWrist: 4.25 * s, // Flat opening
      sleeveCap: 4.5 * s,
      elbowPosition: 14 * s,
      halfElbow: 5.875 * s,
      forearmPosition: 20 * s,
      halfForearm: 5.0 * s,
      bicepCirc: 14.5 * s,
      wristCirc: 8.5 * s,
      elbowCirc: 11.75 * s,
      forearmCirc: 10.0 * s,
      hoodHeight: 14 * s,
      hoodDepth: 10 * s
    };
  }
}
