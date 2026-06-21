const fs = require('fs');
const path = require('path');

const directories = [
  'app/intake/partner/main-applicant',
  'app/intake/partner/spouse-partner',
  'app/intake/protection/main-applicant',
  'app/intake/protection/spouse-partner',
];

function processFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We need to inject profileId logic if not present.
  // First, ensure getProfileIdFromSearchParams is imported.
  if (!content.includes('getProfileIdFromSearchParams')) {
    content = content.replace(
      /import \{([^}]+)\} from "@/lib\/routes";/,
      `import {$1} from "@/lib/routes";\nimport { getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";`
    );
  }

  // Inject profileId extraction
  if (!content.includes('const profileId = getProfileIdFromSearchParams')) {
    content = content.replace(
      /const searchParams = useSearchParams\(\);/,
      `const searchParams = useSearchParams();\n  const profileId = getProfileIdFromSearchParams(searchParams);`
    );
  }

  // Handle getSectionData
  // Look for: draftStore.getSectionData('mainApplicant.details')
  // We need to know the section key being replaced.
  const sectionMatch = content.match(/getSectionData\(['"]([^'"]+)['"]\)/);
  if (sectionMatch) {
    const globalKey = sectionMatch[1];
    
    // Determine the profile section name (details, identity, etc)
    const urlParts = filePath.split('/');
    const sectionName = urlParts[urlParts.length - 2]; // e.g. 'details'
    
    // Replace the load logic
    content = content.replace(
      new RegExp(`draftStore\\.getSectionData\\(['"]${globalKey}['"]\\)`, 'g'),
      `(profileId ? draftSnap.draft?.profiles_data?.[profileId]?.${sectionName} : draftStore.getSectionData('${globalKey}'))`
    );

    // Replace the save logic
    // draftStore.saveSectionData("mainApplicant.details", mergedData);
    // Replace with:
    // profileId ? await draftStore.saveProfileSectionData(profileId, "details", mergedData) : await draftStore.saveSectionData("mainApplicant.details", mergedData)
    content = content.replace(
      new RegExp(`await\\s+draftStore\\.saveSectionData\\(['"]${globalKey}['"],\\s*([^)]+)\\)`, 'g'),
      `profileId ? await draftStore.saveProfileSectionData(profileId, "${sectionName}", $1) : await draftStore.saveSectionData("${globalKey}", $1)`
    );
    
    // Also handle draftSnap.draft?.mainApplicant?.details direct access
    const parts = globalKey.split('.');
    if (parts.length === 2) {
      content = content.replace(
        new RegExp(`draftSnap\\.draft\\?\\.${parts[0]}\\?\\.${parts[1]}`, 'g'),
        `(profileId ? draftSnap.draft?.profiles_data?.[profileId]?.${sectionName} : draftSnap.draft?.${parts[0]}?.${parts[1]})`
      );
    } else {
      content = content.replace(
        new RegExp(`draftSnap\\.draft\\?\\.${globalKey}`, 'g'),
        `(profileId ? draftSnap.draft?.profiles_data?.[profileId]?.${sectionName} : draftSnap.draft?.${globalKey})`
      );
    }
  }

  // Handle markPageComplete
  // await draftStore.markPageComplete(`${visaType}/main-applicant/details`);
  content = content.replace(
    /await\s+draftStore\.markPageComplete\(([^,]+)(?:,\s*null,\s*['"][^'"]+['"])?\);/g,
    `if (profileId) { await draftStore.markProfilePageComplete(profileId, $1); } else { await draftStore.markPageComplete($1); }`
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored ${filePath}`);
  }
}

function traverseDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

for (const dir of directories) {
  traverseDir(dir);
}
