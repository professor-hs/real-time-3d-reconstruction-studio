// Client-Side NIfTI-1 (.nii and .nii.gz) Parser
// Uses browser-native DecompressionStream for .nii.gz decompression
// Extracts dimensions, voxel spacing, and 3D scalar volume data

import { MedicalVolumeData, MedicalVolumeMetadata } from '../types';

export class NiftiParser {
  /**
   * Decompresses gzipped buffer if magic matches 0x1F 0x8B
   */
  public static async decompressIfGzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      // GZIP compressed file (.nii.gz)
      if (typeof DecompressionStream !== 'undefined') {
        const stream = new Response(buffer).body;
        if (stream) {
          const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
          return await new Response(decompressedStream).arrayBuffer();
        }
      }
      throw new Error('DecompressionStream API not available in this browser environment.');
    }
    return buffer;
  }

  /**
   * Parses an uncompressed NIfTI-1 ArrayBuffer
   */
  public static parse(rawBuffer: ArrayBuffer, filename = 'volume.nii'): {
    volumeData: MedicalVolumeData;
    metadata: MedicalVolumeMetadata;
  } {
    const dataView = new DataView(rawBuffer);

    if (rawBuffer.byteLength < 348) {
      throw new Error('File too small to contain a valid 348-byte NIfTI-1 header.');
    }

    // Check endianness
    let isLittleEndian = true;
    const sizeofHdr = dataView.getInt32(0, true);
    if (sizeofHdr !== 348) {
      const sizeofHdrBig = dataView.getInt32(0, false);
      if (sizeofHdrBig === 348) {
        isLittleEndian = false;
      } else {
        throw new Error(`Invalid NIfTI header size: ${sizeofHdr}. Expected 348.`);
      }
    }

    // Dimensions at byte 40 (dim[0..7])
    const dimCount = dataView.getInt16(40, isLittleEndian);
    const nx = dataView.getInt16(42, isLittleEndian);
    const ny = dataView.getInt16(44, isLittleEndian);
    const nz = dataView.getInt16(46, isLittleEndian);

    if (nx <= 0 || ny <= 0 || nz <= 0) {
      throw new Error(`Invalid NIfTI dimensions: ${nx}x${ny}x${nz} (dimCount: ${dimCount})`);
    }

    // Datatype at byte 70
    const datatype = dataView.getInt16(70, isLittleEndian);
    // Voxel spacing at byte 76 (pixdim[1..3])
    const dx = dataView.getFloat32(80, isLittleEndian) || 1.0;
    const dy = dataView.getFloat32(84, isLittleEndian) || 1.0;
    const dz = dataView.getFloat32(88, isLittleEndian) || 1.0;

    // Voxel data offset at byte 108
    const voxOffset = Math.round(dataView.getFloat32(108, isLittleEndian)) || 352;

    // Rescale slope & intercept
    let sclSlope = dataView.getFloat32(112, isLittleEndian);
    if (isNaN(sclSlope) || sclSlope === 0) sclSlope = 1.0;
    let sclInter = dataView.getFloat32(116, isLittleEndian);
    if (isNaN(sclInter)) sclInter = 0.0;

    const totalVoxels = nx * ny * nz;
    const volumeBuffer = new Float32Array(totalVoxels);

    let minVal = Infinity;
    let maxVal = -Infinity;

    // Parse voxel array according to datatype
    let ptr = voxOffset;

    for (let i = 0; i < totalVoxels; i++) {
      let rawVal = 0;

      if (datatype === 2) {
        // uint8
        if (ptr < rawBuffer.byteLength) {
          rawVal = dataView.getUint8(ptr);
          ptr += 1;
        }
      } else if (datatype === 4) {
        // int16
        if (ptr + 1 < rawBuffer.byteLength) {
          rawVal = dataView.getInt16(ptr, isLittleEndian);
          ptr += 2;
        }
      } else if (datatype === 512) {
        // uint16
        if (ptr + 1 < rawBuffer.byteLength) {
          rawVal = dataView.getUint16(ptr, isLittleEndian);
          ptr += 2;
        }
      } else if (datatype === 8) {
        // int32
        if (ptr + 3 < rawBuffer.byteLength) {
          rawVal = dataView.getInt32(ptr, isLittleEndian);
          ptr += 4;
        }
      } else if (datatype === 16) {
        // float32
        if (ptr + 3 < rawBuffer.byteLength) {
          rawVal = dataView.getFloat32(ptr, isLittleEndian);
          ptr += 4;
        }
      } else {
        // Default fallback to int16
        if (ptr + 1 < rawBuffer.byteLength) {
          rawVal = dataView.getInt16(ptr, isLittleEndian);
          ptr += 2;
        }
      }

      const val = rawVal * sclSlope + sclInter;
      volumeBuffer[i] = val;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    const volumeData: MedicalVolumeData = {
      dimensions: [nx, ny, nz],
      spacing: [Math.abs(dx), Math.abs(dy), Math.abs(dz)],
      data: volumeBuffer,
      minVal: isFinite(minVal) ? minVal : 0,
      maxVal: isFinite(maxVal) ? maxVal : 1000,
    };

    const metadata: MedicalVolumeMetadata = {
      seriesDescription: filename,
      modality: filename.toLowerCase().includes('mr') ? 'MR' : 'CT',
      dimensions: [nx, ny, nz],
      voxelSpacing: [Math.abs(dx), Math.abs(dy), Math.abs(dz)],
      windowCenter: Math.round((minVal + maxVal) * 0.4),
      windowWidth: Math.round((maxVal - minVal) * 0.8) || 400,
      minHU: isFinite(minVal) ? minVal : 0,
      maxHU: isFinite(maxVal) ? maxVal : 1000,
      sliceCount: nz,
      patientId: 'NIFTI DATASET',
      isSynthetic: false,
    };

    return { volumeData, metadata };
  }
}
