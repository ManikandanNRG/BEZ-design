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
  static extract(
    meas: any[], 
    sizeKey: string,
    fabricProps?: {
      designEase?: number;
      shrinkageWidth?: number;
      shrinkageLength?: number;
      fabricStretch?: number;
    }
  ): { vars: Record<string, number>, isCm: boolean, scale: number, presentFields: Set<string> } {
    let activeMeas = meas || [];
    if (activeMeas.length === 0) {
      activeMeas = [
        { description: 'body length', value: 28 },
        { description: 'chest', value: 20 },
        { description: 'sweep', value: 20 },
        { description: 'across shoulder', value: 17 },
        { description: 'shoulder slope', value: 1.75 },
        { description: 'shoulder length', value: 6 },
        { description: 'across front', value: 14.62 },
        { description: 'across back', value: 15.38 },
        { description: 'neck width', value: 7.5 },
        { description: 'front neck drop', value: 4.5 },
        { description: 'back neck drop', value: 0.5 },
        { description: 'armhole curve', value: 19 },
        { description: 'armhole straight', value: 8.5 },
        { description: 'sleeve length', value: 25.5 },
        { description: 'bicep', value: 7.25 },
        { description: 'cuff', value: 4.25 },
        { description: 'sleeve cap', value: 4.5 },
        { description: 'sleeve underarm', value: 3.0 },
        { description: 'elbow position', value: 14 },
        { description: 'elbow width', value: 11.75 },
        { description: 'forearm position', value: 20 },
        { description: 'forearm width', value: 10 },
        { description: 'hood height', value: 14 },
        { description: 'hood depth', value: 10 }
      ];
    }

    // 1. First, find a major length dimension to determine CM vs INCHES
    const rawLength = this.findRawValue(activeMeas, sizeKey, ['length', 'hsp', 'center back length', 'body length'], ['sleeve', 'shoulder', 'cuff', 'pocket', 'collar', 'neck', 'drop', 'opening', 'bicep', 'hood']);
    const isCm: boolean = !!rawLength && rawLength > 50; // If a length is > 50, it's almost certainly CM.
    const scale = isCm ? 10 : 25.4; // Internal CAD unit is millimeters (1:1)

    // Track which CAD variable names were actually found in the uploaded spec sheet.
    // Only add a key here when findRawValue returns a non-null value (real match, not fallback).
    const presentFields = new Set<string>();

    // Helper to get exactly what the CAD kernel needs
    const get = (
      fieldName: string,   // CAD variable name — added to presentFields when found in sheet
      aliases: string[], 
      fallbackRaw: number, 
      rejects: string[] = [], 
      divisionRule: 'none' | 'half' | 'circumference' = 'none'
    ): number => {
      const val = this.findRawValue(activeMeas, sizeKey, aliases, rejects);
      if (val !== null) {
        presentFields.add(fieldName); // Mark this variable as present in the spec sheet
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
          const isBicepOrWristCirc = ((aliases.includes('bicep') || aliases.includes('biceps')) && ((val > 10 && !isCm) || (val > 25 && isCm))) ||
                                     ((aliases.includes('sleeve opening') || aliases.includes('cuff') || aliases.includes('wrist') || aliases.includes('sleeve open')) && ((val > 6 && !isCm) || (val > 15 && isCm)));
          if (isBicepOrWristCirc) {
            finalRaw = finalRaw / 2;
          }
        }

        return finalRaw * scale;
      }
      // --- FALLBACK: value not found in spec sheet ---
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
    const bodyLength = get('bodyLength', ['length', 'hsp', 'center back length', 'body length'], isCm ? 70 : 28, ['sleeve', 'shoulder', 'cuff', 'pocket', 'collar', 'neck', 'drop', 'opening', 'bicep', 'hood'], 'none');
    
    // Chest (expects 1/4 of full circumference, or 1/2 of flat width)
    const halfChest = get('halfChest', ['chest', 'bust', '1/2 chest', 'across chest', 'chest width', 'pit to pit'], isCm ? 50 : 20, ['neck', 'shoulder', 'sleeve', 'cuff', 'hem', 'bottom', 'sweep', 'collar', 'pocket', 'opening', 'drop', 'back', 'front'], 'circumference');
    
    // Bottom / Hem (expects 1/4 of full sweep, or 1/2 of flat sweep)
    const halfHem = get('halfHem', ['sweep', 'hem', 'bottom', 'rib opening', 'waist'], isCm ? 50 : 20, ['neck', 'shoulder', 'sleeve', 'chest', 'collar', 'pocket'], 'circumference');

    // Shoulder (expects 1/2 of seam-to-seam width)
    const halfShoulder = get('halfShoulder', ['shoulder width', 'across shoulder', 'shoulder to shoulder', 'shoulder span'], isCm ? 44 : 17, ['slope', 'angle', 'drop', 'neck', 'seam length', 'sleeve'], 'half');
    const shoulderSlope = get('shoulderSlope', ['shoulder slope', 'shoulder drop'], isCm ? 4.5 : 1.75, [], 'none');
    const shoulderLength = get('shoulderLength', ['shoulder length', 'shoulder seam'], isCm ? 15 : 6, [], 'none');

    // Across Front / Back (expects 1/2 of seam-to-seam width)
    const acrossFront = get('acrossFront', ['across front', 'cross front', 'x-front', 'front width'], isCm ? 36 : 14.62, ['neck', 'shoulder', 'sleeve', 'chest', 'back'], 'half');
    const acrossBack = get('acrossBack', ['across back', 'cross back', 'x-back', 'back width'], isCm ? 38 : 15.38, ['neck', 'shoulder', 'sleeve', 'chest', 'front'], 'half');

    // Neck (expects 1/2 of neck opening width)
    const halfNeck = get('halfNeck', ['neck width', 'neck opening', 'collar width', 'neck circ'], isCm ? 18 : 7.5, ['drop', 'height', 'depth', 'shoulder', 'chest'], 'half');
    const frontNeckDrop = get('frontNeckDrop', ['front neck drop', 'fnd'], isCm ? 11 : 4.5, [], 'none');
    const backNeckDrop = get('backNeckDrop', ['back neck drop', 'bnd'], isCm ? 1.5 : 0.5, [], 'none');

    // Armhole
    const armholeCirc = get('armholeCirc', ['armhole curve', 'armhole circumference', 'scye'], isCm ? 50 : 20, [], 'half');
    const armholeStraight = get('armholeStraight', ['armhole straight', 'armhole depth'], isCm ? 22 : 8.5, [], 'none');

    // Sleeve (expects flat sleeve bicep/wrist widths)
    const sleeveLength = get('sleeveLength', ['sleeve length', 'slv len', 'cb sleeve'], isCm ? 65 : 25.5, ['opening', 'open', 'cuff', 'wrist', 'width', 'bicep', 'biceps', 'muscle'], 'none');
    const halfBicep = get('halfBicep', ['bicep', 'biceps', 'muscle', 'sleeve width', 'upper arm'], isCm ? 18 : 7.25, ['length', 'chest', 'shoulder', 'open', 'opening'], 'none');
    const halfWrist = get('halfWrist', ['sleeve opening', 'cuff', 'wrist', 'sleeve open'], isCm ? 9 : 4.25, ['length', 'chest', 'shoulder', 'bicep'], 'none');
    const sleeveCap = get('sleeveCap', ['sleeve cap', 'crown height', 'cap height'], isCm ? 12 : 4.5, [], 'none');
    const sleeveUnderarm = get('sleeveUnderarm', ['sleeve underarm', 'underarm length', 'sleeve underarm length'], isCm ? 8 : 3.0, [], 'none');

    // Elbow and Forearm variables
    const elbowPosition = get('elbowPosition', ['elbow position', 'elbow position from shoulder seam'], isCm ? 35 : 14, [], 'none');
    const halfElbow = get('halfElbow', ['elbow width', 'elbow width all round', 'elbow girth'], isCm ? 15 : 5.875, [], 'half');
    const forearmPosition = get('forearmPosition', ['forearm position', 'forearm position from shoulder seam'], isCm ? 50 : 20, [], 'none');
    const halfForearm = get('halfForearm', ['forearm width', 'forearm width all round', 'forearm girth'], isCm ? 13 : 5.0, [], 'half');

    // Full circumferences for labels
    // These are derived from found values — mark them as present if their source is present
    const bicepCirc = halfBicep * 2;
    if (presentFields.has('halfBicep')) presentFields.add('bicepCirc');
    const wristCirc = halfWrist * 2;
    if (presentFields.has('halfWrist')) presentFields.add('wristCirc');
    const elbowCirc = halfElbow * 2;
    if (presentFields.has('halfElbow')) presentFields.add('elbowCirc');
    const forearmCirc = halfForearm * 2;
    if (presentFields.has('halfForearm')) presentFields.add('forearmCirc');

    // Hood
    const hoodHeight = get('hoodHeight', ['hood height', 'hood length'], isCm ? 36 : 14, [], 'none');
    const hoodDepth = get('hoodDepth', ['hood width', 'hood depth'], isCm ? 26 : 10, [], 'none');

    // Calculate bicepOffset based on whether bicep description specifies e.g. "1 inch below" or "1\" below"
    const bicepDesc = this.findDescription(meas, ['bicep', 'biceps', 'muscle', 'sleeve width', 'upper arm']);
    let bicepOffset = 1.0 * 25.4; // Default to 1 inch in mm
    if (bicepDesc) {
      const match = bicepDesc.match(/(\d+(\.\d+)?)\s*(?:"|inch|cm)/i);
      if (match) {
        const val = parseFloat(match[1]);
        if (match[0].toLowerCase().includes('cm')) {
          bicepOffset = val * 10;
        } else {
          bicepOffset = val * 25.4;
        }
      }
    }

    // 3. Determine and apply design ease and fabric properties
    const isChestCircumference = (() => {
      const val = this.findRawValue(meas, sizeKey, ['chest', 'bust', '1/2 chest', 'across chest', 'chest width', 'pit to pit']);
      if (val !== null) {
        return (val > 30 && !isCm) || (val > 75 && isCm);
      }
      return false;
    })();

    const isHemCircumference = (() => {
      const val = this.findRawValue(meas, sizeKey, ['sweep', 'hem', 'bottom', 'rib opening', 'waist']);
      if (val !== null) {
        return (val > 30 && !isCm) || (val > 75 && isCm);
      }
      return false;
    })();

    const designEaseMm = (fabricProps?.designEase || 0) * scale;
    const chestEase = designEaseMm / (isChestCircumference ? 4 : 2);
    const hemEase = designEaseMm / (isHemCircumference ? 4 : 2);
    const bicepEase = designEaseMm * 0.1; // proportional ease for bicep

    // Shrinkage & Stretch Factors
    const wShrinkComp = 1 / (1 - (fabricProps?.shrinkageWidth || 0) / 100);
    const wStretchComp = 1 - (fabricProps?.fabricStretch || 0) / 100;
    const widthFactor = wShrinkComp * wStretchComp;

    const lengthFactor = 1 / (1 - (fabricProps?.shrinkageLength || 0) / 100);

    // Apply shrinkage and stretch
    const bodyLengthComp = bodyLength * lengthFactor;
    const halfChestComp = (halfChest + chestEase) * widthFactor;
    const halfHemComp = (halfHem + hemEase) * widthFactor;
    const halfShoulderComp = halfShoulder * widthFactor;
    const shoulderSlopeComp = shoulderSlope * lengthFactor;
    const shoulderLengthComp = shoulderLength * lengthFactor;
    const acrossFrontComp = acrossFront * widthFactor;
    const acrossBackComp = acrossBack * widthFactor;
    const halfNeckComp = halfNeck * widthFactor;
    const frontNeckDropComp = frontNeckDrop * lengthFactor;
    const backNeckDropComp = backNeckDrop * lengthFactor;
    const armholeCircComp = armholeCirc * lengthFactor;
    const armholeStraightComp = armholeStraight * lengthFactor;
    const sleeveLengthComp = sleeveLength * lengthFactor;
    const halfBicepComp = (halfBicep + bicepEase) * widthFactor;
    const halfWristComp = halfWrist * widthFactor;
    const sleeveCapComp = sleeveCap * lengthFactor;
    const sleeveUnderarmComp = sleeveUnderarm * lengthFactor;
    const elbowPositionComp = elbowPosition * lengthFactor;
    const halfElbowComp = halfElbow * widthFactor;
    const forearmPositionComp = forearmPosition * lengthFactor;
    const halfForearmComp = halfForearm * widthFactor;
    const bicepCircComp = (bicepCirc + (bicepEase * 2)) * widthFactor;
    const wristCircComp = wristCirc * widthFactor;
    const elbowCircComp = elbowCirc * widthFactor;
    const forearmCircComp = forearmCirc * widthFactor;
    const hoodHeightComp = hoodHeight * lengthFactor;
    const hoodDepthComp = hoodDepth * widthFactor;
    const bicepOffsetComp = bicepOffset * lengthFactor;

    const shoulderAngleRad = Math.atan(shoulderSlopeComp / ((halfShoulderComp - halfNeckComp) || 1));
    const shoulderAngleDeg = shoulderAngleRad * (180 / Math.PI);

    return {
      isCm,
      scale,
      presentFields,
      vars: {
        bodyLength: bodyLengthComp,
        halfChest: halfChestComp,
        halfHem: halfHemComp,
        halfShoulder: halfShoulderComp,
        shoulderSlope: shoulderSlopeComp,
        shoulderLength: shoulderLengthComp,
        shoulderAngleRad,
        shoulderAngleDeg,
        acrossFront: acrossFrontComp,
        acrossBack: acrossBackComp,
        halfNeck: halfNeckComp,
        frontNeckDrop: frontNeckDropComp,
        backNeckDrop: backNeckDropComp,
        armholeCirc: armholeCircComp,
        armholeStraight: armholeStraightComp,
        sleeveLength: sleeveLengthComp,
        halfBicep: halfBicepComp,
        halfWrist: halfWristComp,
        sleeveCap: sleeveCapComp,
        sleeveUnderarm: sleeveUnderarmComp,
        bicepOffset: bicepOffsetComp,
        elbowPosition: elbowPositionComp,
        halfElbow: halfElbowComp,
        forearmPosition: forearmPositionComp,
        halfForearm: halfForearmComp,
        bicepCirc: bicepCircComp,
        wristCirc: wristCircComp,
        elbowCirc: elbowCircComp,
        forearmCirc: forearmCircComp,
        hoodHeight: hoodHeightComp,
        hoodDepth: hoodDepthComp,
        
        // Configurable drafting profile default parameters
        armholeEntryRatioFront: 0.60,
        armholeExitRatioFront: 0.37,
        frontArmholeAngleDeg: 8,
        armholeEntryRatioBack: 0.57,
        armholeExitRatioBack: 0.50,
        backArmholeExitMultiplier: 1.50,
        backArmholeAngleDeg: 5
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
    const halfShoulder = 8.5 * s;
    const halfNeck = 3.75 * s;
    const shoulderSlope = 1.75 * s;
    const shoulderAngleRad = Math.atan(shoulderSlope / ((halfShoulder - halfNeck) || 1));
    const shoulderAngleDeg = shoulderAngleRad * (180 / Math.PI);

    return {
      bodyLength: 28 * s,
      halfChest: 10 * s, // 1/4 of 40" chest circumference
      halfHem: 10 * s,
      halfShoulder,
      shoulderSlope,
      shoulderLength: 6 * s,
      shoulderAngleRad,
      shoulderAngleDeg,
      acrossFront: 7.31 * s, // 1/2 of 14.62"
      acrossBack: 7.69 * s, // 1/2 of 15.38"
      halfNeck, // 1/2 of 7.5"
      frontNeckDrop: 4.5 * s,
      backNeckDrop: 0.5 * s,
      armholeCirc: 9.5 * s,
      armholeStraight: 8.5 * s,
      sleeveLength: 25.5 * s,
      halfBicep: 7.25 * s, // Flat bicep width
      halfWrist: 4.25 * s, // Flat opening
      sleeveCap: 4.5 * s,
      sleeveUnderarm: 3.0 * s,
      bicepOffset: 1.0 * s,
      elbowPosition: 14 * s,
      halfElbow: 5.875 * s,
      forearmPosition: 20 * s,
      halfForearm: 5.0 * s,
      bicepCirc: 14.5 * s,
      wristCirc: 8.5 * s,
      elbowCirc: 11.75 * s,
      forearmCirc: 10.0 * s,
      hoodHeight: 14 * s,
      hoodDepth: 10 * s,
      
      // Default ratios for drafting profile
      armholeEntryRatioFront: 0.60,
      armholeExitRatioFront: 0.37,
      frontArmholeAngleDeg: 8,
      armholeEntryRatioBack: 0.57,
      armholeExitRatioBack: 0.50,
      backArmholeExitMultiplier: 1.50,
      backArmholeAngleDeg: 5
    };
  }
}
