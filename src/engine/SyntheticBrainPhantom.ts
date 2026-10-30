// High-Fidelity Synthetic 3D CT/MRI Head & Brain Phantom Generator
// Generates an anatomically accurate volumetric phantom completely offline
// Calibrated with clinically authentic Hounsfield Units (HU)

import { MedicalVolumeData, MedicalVolumeMetadata } from '../types';

export function createSyntheticBrainPhantom(
  width = 128,
  height = 128,
  depth = 64
): { data: MedicalVolumeData; metadata: MedicalVolumeMetadata } {
  const totalVoxels = width * height * depth;
  const buffer = new Float32Array(totalVoxels);

  const cx = width / 2;
  const cy = height / 2;
  const cz = depth / 2;

  // Normalized radius scales for human head cranium (ellipsoid)
  const rxHead = width * 0.44;
  const ryHead = height * 0.40;
  const rzHead = depth * 0.45;

  const skullThickness = width * 0.045;

  let minVal = 2000;
  let maxVal = -2000;

  for (let z = 0; z < depth; z++) {
    const dz = (z - cz) / rzHead;

    for (let y = 0; y < height; y++) {
      const dy = (y - cy) / ryHead;

      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / rxHead;
        const idx = z * (width * height) + y * width + x;

        // Base Air value
        let hu = -1000.0;

        // Outer Cranium Ellipsoid
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq <= 1.0) {
          // Inside Head
          const skullDistSq = Math.pow(dx * (rxHead / (rxHead - skullThickness)), 2) +
                              Math.pow(dy * (ryHead / (ryHead - skullThickness)), 2) +
                              Math.pow(dz * (rzHead / (rzHead - skullThickness * 0.6)), 2);

          if (skullDistSq > 1.0) {
            // Cortical Skull Bone (Dense, High HU)
            // Outer table, diploic spongy bone, inner table
            const diploe = Math.sin((distSq - 0.85) * 30.0) * 150.0;
            hu = 1100.0 + diploe + (Math.random() - 0.5) * 40.0;
          } else {
            // Intracranial Compartment
            // Subdural space / CSF
            hu = 5.0 + (Math.random() - 0.5) * 3.0; // CSF HU ~ 0 to 10

            // Brain Parenchyma (Cerebral Hemispheres)
            const brainX = (x - cx) / (rxHead - skullThickness - 2);
            const brainY = (y - cy) / (ryHead - skullThickness - 2);
            const brainZ = (z - cz) / (rzHead - skullThickness * 0.6 - 1);
            const brainDistSq = brainX * brainX + brainY * brainY + brainZ * brainZ;

            if (brainDistSq <= 1.0) {
              // Interhemispheric fissure (falx cerebri)
              const fissureDist = Math.abs(x - cx);
              if (fissureDist < 1.5 && brainDistSq < 0.9) {
                hu = 15.0; // Dura / CSF in falx
              } else {
                // Gyri / Sulci cortical modulation
                const sulci = Math.sin(x * 0.35) * Math.cos(y * 0.35) * Math.sin(z * 0.4);
                
                // Gray Matter (Cortex) vs White Matter (Medulla)
                const isCortex = brainDistSq > 0.65;
                if (isCortex) {
                  hu = 38.0 + sulci * 6.0; // Gray Matter HU ~ 35 - 45
                } else {
                  hu = 28.0 + sulci * 3.0; // White Matter HU ~ 25 - 32
                }

                // Ventricular System (Lateral Ventricles)
                // Anterior horns (z near mid, x bilateral, y anterior)
                const leftVentX = cx - width * 0.10;
                const rightVentX = cx + width * 0.10;
                const ventY = cy - height * 0.05;

                const dLeftVent = Math.pow((x - leftVentX) / 5.0, 2) +
                                  Math.pow((y - ventY) / 14.0, 2) +
                                  Math.pow((z - cz) / 7.0, 2);

                const dRightVent = Math.pow((x - rightVentX) / 5.0, 2) +
                                   Math.pow((y - ventY) / 14.0, 2) +
                                   Math.pow((z - cz) / 7.0, 2);

                if (dLeftVent <= 1.0 || dRightVent <= 1.0) {
                  hu = 4.0 + (Math.random() - 0.5) * 2.0; // Ventricle CSF (HU ~ 4)
                }

                // 3rd Ventricle (Slit-like midline)
                if (Math.abs(x - cx) < 1.2 && Math.abs(y - cy) < 6.0 && Math.abs(z - cz) < 5.0) {
                  hu = 2.0;
                }

                // Basal Ganglia / Thalami (Hyperdense relative to white matter)
                const thalamusDist = Math.pow((Math.abs(x - cx) - width * 0.12) / 7.0, 2) +
                                     Math.pow((y - cy) / 8.0, 2) +
                                     Math.pow((z - cz) / 5.0, 2);
                if (thalamusDist <= 1.0) {
                  hu = 42.0; // Thalamic nuclei
                }

                // Focal High-Contrast Hyperdense Pathology (e.g. Acute Intraparenchymal Hematoma / Contrast Tumor)
                // Located in right parietal lobe
                const lesionX = cx + width * 0.22;
                const lesionY = cy + height * 0.12;
                const lesionZ = cz + depth * 0.05;
                const dLesion = Math.pow((x - lesionX) / 8.0, 2) +
                                Math.pow((y - lesionY) / 7.0, 2) +
                                Math.pow((z - lesionZ) / 6.0, 2);

                if (dLesion <= 1.0) {
                  // Acute hematoma with surrounding vasogenic edema
                  if (dLesion <= 0.6) {
                    hu = 75.0 + (Math.random() - 0.5) * 5.0; // Clot / High-density hematoma (HU ~ 70-80)
                  } else {
                    hu = 18.0; // Perilesional hypodense edema (HU ~ 18-22)
                  }
                }
              }
            }
          }
        } else {
          // Scalp Soft Tissue outside cranium
          const scalpDistSq = Math.pow(dx * (rxHead / (rxHead + 3)), 2) +
                              Math.pow(dy * (ryHead / (ryHead + 3)), 2) +
                              Math.pow(dz * (rzHead / (rzHead + 2)), 2);
          if (scalpDistSq <= 1.0) {
            hu = 35.0; // Scalp skin & subcutaneous tissue
          }
        }

        buffer[idx] = hu;
        if (hu < minVal) minVal = hu;
        if (hu > maxVal) maxVal = hu;
      }
    }
  }

  const volumeData: MedicalVolumeData = {
    dimensions: [width, height, depth],
    spacing: [1.2, 1.2, 2.5], // Realistic clinical voxel spacing (1.2mm in-plane, 2.5mm slice thickness)
    data: buffer,
    minVal,
    maxVal,
  };

  const metadata: MedicalVolumeMetadata = {
    seriesDescription: 'Synthetic Calibrated Neuro Head CT Phantom',
    modality: 'CT',
    dimensions: [width, height, depth],
    voxelSpacing: [1.2, 1.2, 2.5],
    windowCenter: 40,   // Standard Brain Window Level
    windowWidth: 80,    // Standard Brain Window Width (30 to 50 HU brain parenchymal detail)
    minHU: minVal,
    maxHU: maxVal,
    sliceCount: depth,
    patientId: 'SYNTH-PHANTOM-001 (Offline Demonstration)',
    isSynthetic: true,
  };

  return { data: volumeData, metadata };
}
