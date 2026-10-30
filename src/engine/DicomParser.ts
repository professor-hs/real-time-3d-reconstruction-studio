// Native Client-Side DICOM Part 10 Parser and Series Volume Assembler
// Parses DICOM binary structures, extracts tags, calibrates Hounsfield Units,
// and sorts multi-slice series into 3D volumetric arrays.

import { MedicalModality, MedicalVolumeData, MedicalVolumeMetadata } from '../types';

export interface ParsedDicomSlice {
  rows: number;
  columns: number;
  bitsAllocated: number;
  pixelRepresentation: number; // 0 = unsigned, 1 = signed
  rescaleSlope: number;
  rescaleIntercept: number;
  windowCenter: number;
  windowWidth: number;
  sliceLocation: number;
  instanceNumber: number;
  pixelSpacing: [number, number];
  sliceThickness: number;
  modality: MedicalModality;
  seriesDescription: string;
  patientId: string;
  pixelData: Float32Array; // Calibrated HU / intensity
}

export class DicomParser {
  /**
   * Parses a single DICOM file from an ArrayBuffer
   */
  public static parseSlice(buffer: ArrayBuffer): ParsedDicomSlice {
    const dataView = new DataView(buffer);
    const length = buffer.byteLength;

    if (length < 132) {
      throw new Error('File is too small to be a valid DICOM Part 10 dataset.');
    }

    // Verify 128-byte preamble + 'DICM' signature at byte 128
    const magic = String.fromCharCode(
      dataView.getUint8(128),
      dataView.getUint8(129),
      dataView.getUint8(130),
      dataView.getUint8(131)
    );

    let offset = 132;
    let isExplicitVR = true;

    if (magic !== 'DICM') {
      // Some raw DICOM files lack preamble; attempt offset 0 fallback
      offset = 0;
    }

    let rows = 512;
    let columns = 512;
    let bitsAllocated = 16;
    let pixelRepresentation = 0;
    let rescaleSlope = 1.0;
    let rescaleIntercept = 0.0;
    let windowCenter = 40.0;
    let windowWidth = 400.0;
    let sliceLocation = 0.0;
    let instanceNumber = 1;
    let pixelSpacing: [number, number] = [1.0, 1.0];
    let sliceThickness = 2.0;
    let modality: MedicalModality = 'CT';
    let seriesDescription = 'DICOM Series';
    let patientId = 'ANONYMOUS';
    let pixelDataOffset = -1;

    // Helper to read string from dataView
    const readString = (start: number, len: number): string => {
      let str = '';
      for (let i = 0; i < len; i++) {
        const charCode = dataView.getUint8(start + i);
        if (charCode !== 0) str += String.fromCharCode(charCode);
      }
      return str.trim();
    };

    while (offset < length - 8) {
      const group = dataView.getUint16(offset, true);
      const element = dataView.getUint16(offset + 2, true);
      offset += 4;

      let vr = '';
      let elementLength = 0;

      // Check Explicit VR vs Implicit VR
      const vrChar1 = String.fromCharCode(dataView.getUint8(offset));
      const vrChar2 = String.fromCharCode(dataView.getUint8(offset + 1));
      const isPossibleVR = /^[A-Z]{2}$/.test(vrChar1 + vrChar2);

      if (isExplicitVR && isPossibleVR) {
        vr = vrChar1 + vrChar2;
        offset += 2;

        if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
          offset += 2; // Reserved 2 bytes
          elementLength = dataView.getUint32(offset, true);
          offset += 4;
        } else {
          elementLength = dataView.getUint16(offset, true);
          offset += 2;
        }
      } else {
        isExplicitVR = false;
        elementLength = dataView.getUint32(offset, true);
        offset += 4;
      }

      // Check if pixel data tag (0x7FE0, 0x0010)
      if (group === 0x7FE0 && element === 0x0010) {
        pixelDataOffset = offset;
        break; // Pixel data is generally the final element
      }

      // Safety clamp
      if (elementLength < 0 || offset + elementLength > length) {
        break;
      }

      // Tag decoding
      if (group === 0x0028 && element === 0x0010) {
        rows = dataView.getUint16(offset, true);
      } else if (group === 0x0028 && element === 0x0011) {
        columns = dataView.getUint16(offset, true);
      } else if (group === 0x0028 && element === 0x0100) {
        bitsAllocated = dataView.getUint16(offset, true);
      } else if (group === 0x0028 && element === 0x0103) {
        pixelRepresentation = dataView.getUint16(offset, true);
      } else if (group === 0x0028 && element === 0x1052) {
        rescaleIntercept = parseFloat(readString(offset, elementLength)) || 0.0;
      } else if (group === 0x0028 && element === 0x1053) {
        rescaleSlope = parseFloat(readString(offset, elementLength)) || 1.0;
      } else if (group === 0x0028 && element === 0x1050) {
        const wcStr = readString(offset, elementLength).split('\\')[0];
        windowCenter = parseFloat(wcStr) || 40.0;
      } else if (group === 0x0028 && element === 0x1051) {
        const wwStr = readString(offset, elementLength).split('\\')[0];
        windowWidth = parseFloat(wwStr) || 400.0;
      } else if (group === 0x0020 && element === 0x1041) {
        sliceLocation = parseFloat(readString(offset, elementLength)) || 0.0;
      } else if (group === 0x0020 && element === 0x0013) {
        instanceNumber = parseInt(readString(offset, elementLength), 10) || 1;
      } else if (group === 0x0028 && element === 0x0030) {
        const parts = readString(offset, elementLength).split('\\');
        if (parts.length >= 2) {
          pixelSpacing = [parseFloat(parts[0]) || 1.0, parseFloat(parts[1]) || 1.0];
        }
      } else if (group === 0x0018 && element === 0x0050) {
        sliceThickness = parseFloat(readString(offset, elementLength)) || 2.0;
      } else if (group === 0x0008 && element === 0x0060) {
        const m = readString(offset, elementLength).toUpperCase();
        if (['CT', 'MR', 'PET'].includes(m)) modality = m as MedicalModality;
      } else if (group === 0x0008 && element === 0x103E) {
        seriesDescription = readString(offset, elementLength);
      } else if (group === 0x0010 && element === 0x0020) {
        patientId = readString(offset, elementLength) || 'ANONYMOUS';
      }

      offset += elementLength;
    }

    if (pixelDataOffset === -1) {
      throw new Error('DICOM pixel data tag (7FE0,0010) could not be located.');
    }

    // Decode raster pixel buffer
    const numPixels = rows * columns;
    const pixelData = new Float32Array(numPixels);

    if (bitsAllocated === 16) {
      const isSigned = pixelRepresentation === 1;
      for (let i = 0; i < numPixels; i++) {
        const bytePos = pixelDataOffset + i * 2;
        if (bytePos + 1 >= length) break;
        const rawVal = isSigned ? dataView.getInt16(bytePos, true) : dataView.getUint16(bytePos, true);
        pixelData[i] = rawVal * rescaleSlope + rescaleIntercept;
      }
    } else {
      // 8-bit image
      for (let i = 0; i < numPixels; i++) {
        const bytePos = pixelDataOffset + i;
        if (bytePos >= length) break;
        const rawVal = dataView.getUint8(bytePos);
        pixelData[i] = rawVal * rescaleSlope + rescaleIntercept;
      }
    }

    return {
      rows,
      columns,
      bitsAllocated,
      pixelRepresentation,
      rescaleSlope,
      rescaleIntercept,
      windowCenter,
      windowWidth,
      sliceLocation,
      instanceNumber,
      pixelSpacing,
      sliceThickness,
      modality,
      seriesDescription,
      patientId,
      pixelData,
    };
  }

  /**
   * Assembles multiple DICOM slices into a single sorted 3D volume
   */
  public static assembleSeries(slices: ParsedDicomSlice[]): {
    volumeData: MedicalVolumeData;
    metadata: MedicalVolumeMetadata;
  } {
    if (slices.length === 0) {
      throw new Error('No DICOM slices provided for series reconstruction.');
    }

    // Sort slices by sliceLocation or instanceNumber
    const sorted = [...slices].sort((a, b) => {
      if (a.sliceLocation !== b.sliceLocation) {
        return a.sliceLocation - b.sliceLocation;
      }
      return a.instanceNumber - b.instanceNumber;
    });

    const first = sorted[0];
    const width = first.columns;
    const height = first.rows;
    const depth = sorted.length;

    // Calculate actual slice spacing from delta between consecutive slice locations
    let calculatedSpacingZ = first.sliceThickness;
    if (sorted.length > 1) {
      const locDiff = Math.abs(sorted[sorted.length - 1].sliceLocation - sorted[0].sliceLocation);
      if (locDiff > 0) {
        calculatedSpacingZ = parseFloat((locDiff / (sorted.length - 1)).toFixed(2));
      }
    }

    const totalVoxels = width * height * depth;
    const volumeBuffer = new Float32Array(totalVoxels);

    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let z = 0; z < depth; z++) {
      const slice = sorted[z];
      const sliceOffset = z * (width * height);
      for (let i = 0; i < width * height; i++) {
        const val = slice.pixelData[i] || 0;
        volumeBuffer[sliceOffset + i] = val;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    }

    const volumeData: MedicalVolumeData = {
      dimensions: [width, height, depth],
      spacing: [first.pixelSpacing[0], first.pixelSpacing[1], calculatedSpacingZ],
      data: volumeBuffer,
      minVal: isFinite(minVal) ? minVal : 0,
      maxVal: isFinite(maxVal) ? maxVal : 1000,
    };

    const metadata: MedicalVolumeMetadata = {
      seriesDescription: first.seriesDescription || 'DICOM Series Volume',
      modality: first.modality,
      dimensions: [width, height, depth],
      voxelSpacing: [first.pixelSpacing[0], first.pixelSpacing[1], calculatedSpacingZ],
      windowCenter: first.windowCenter,
      windowWidth: first.windowWidth,
      minHU: isFinite(minVal) ? minVal : 0,
      maxHU: isFinite(maxVal) ? maxVal : 1000,
      sliceCount: depth,
      patientId: first.patientId,
      isSynthetic: false,
    };

    return { volumeData, metadata };
  }
}
