import os
import re

directories = [
    'app/intake/partner/main-applicant',
    'app/intake/partner/spouse-partner',
    'app/intake/protection/main-applicant',
    'app/intake/protection/spouse-partner',
]

for dir_path in directories:
    if not os.path.exists(dir_path):
        continue
    for root, _, files in os.walk(dir_path):
        for file in files:
            if not file.endswith('.js') and not file.endswith('.jsx'):
                continue
            
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            original_content = content
            
            if 'getProfileIdFromSearchParams' not in content:
                content = re.sub(
                    r'import \{([^}]+)\} from "@/lib/routes";',
                    r'import {\1} from "@/lib/routes";\nimport { getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";',
                    content
                )
                
            if 'const profileId = getProfileIdFromSearchParams' not in content:
                content = re.sub(
                    r'const searchParams = useSearchParams\(\);',
                    r'const searchParams = useSearchParams();\n  const profileId = getProfileIdFromSearchParams(searchParams);',
                    content
                )

            # Find the global section data key
            match = re.search(r'getSectionData\([\'"]([^\'"]+)[\'"]\)', content)
            if match:
                global_key = match.group(1)
                section_name = os.path.basename(os.path.dirname(filepath))
                
                # Replace loads
                content = re.sub(
                    r'draftStore\.getSectionData\([\'"]' + re.escape(global_key) + r'[\'"]\)',
                    f"(profileId ? draftSnap.draft?.profiles_data?.[profileId]?.{section_name} : draftStore.getSectionData('{global_key}'))",
                    content
                )
                
                # Replace saves
                content = re.sub(
                    r'await\s+draftStore\.saveSectionData\([\'"]' + re.escape(global_key) + r'[\'"],\s*([^)]+)\)',
                    f'profileId ? await draftStore.saveProfileSectionData(profileId, "{section_name}", \\1) : await draftStore.saveSectionData("{global_key}", \\1)',
                    content
                )
                
                # Replace direct draftSnap access
                parts = global_key.split('.')
                if len(parts) == 2:
                    content = re.sub(
                        r'draftSnap\.draft\?\.' + re.escape(parts[0]) + r'\?\.' + re.escape(parts[1]),
                        f"(profileId ? draftSnap.draft?.profiles_data?.[profileId]?.{section_name} : draftSnap.draft?.{parts[0]}?.{parts[1]})",
                        content
                    )
                else:
                    content = re.sub(
                        r'draftSnap\.draft\?\.' + re.escape(global_key),
                        f"(profileId ? draftSnap.draft?.profiles_data?.[profileId]?.{section_name} : draftSnap.draft?.{global_key})",
                        content
                    )
                    
            # markPageComplete
            content = re.sub(
                r'await\s+draftStore\.markPageComplete\(([^,]+)(?:,\s*null,\s*[\'"][^\'"]+[\'"])?\);',
                r'if (profileId) { await draftStore.markProfilePageComplete(profileId, \1); } else { await draftStore.markPageComplete(\1); }',
                content
            )

            if content != original_content:
                with open(filepath, 'w') as f:
                    f.write(content)
                print(f"Refactored {filepath}")

