const fs = require('fs');
const path = require('path');

// Files that need to be fixed
const filesToFix = [
  'app/dashboard/athletes/create/page.tsx',
  'app/dashboard/athletes/page.tsx',
  'app/dashboard/members/page.tsx',
  'app/dashboard/reports/page.tsx',
  'app/dashboard/settings/page.tsx',
  'app/dashboard/tournaments/[id]/edit/page.tsx',
  'app/dashboard/tournaments/[id]/page.tsx',
  'app/dashboard/tournaments/create/page.tsx',
  'app/dashboard/tournaments/page.tsx',
  'app/tournaments/[id]/page.tsx',
  'app/tournaments/[id]/register/page.tsx'
];

// Fix each file
filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  try {
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace .eq("id", userId) with .eq("clerk_id", userId)
      const updatedContent = content.replace(
        /\.eq\("id",\s*userId\)/g,
        '.eq("clerk_id", userId)'
      );
      
      if (content !== updatedContent) {
        fs.writeFileSync(fullPath, updatedContent);
        console.log(`Fixed: ${filePath}`);
      } else {
        console.log(`No changes needed: ${filePath}`);
      }
    } else {
      console.log(`File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Profile lookup fix complete!');
