/**
 * Script to add mobile responsiveness CSS link to all remaining HTML pages
 * Run with: node add-mobile-css.js
 */

const fs = require('fs');
const path = require('path');

const CSS_LINK = '<link rel="stylesheet" href="/css/mobile-responsiveness-fixes.css">';

const filesToUpdate = [
    'public/signup.html',
    'public/market.html',
    'public/market-trends.html',
    'public/recommendations.html',
    'public/profile.html',
    'public/farmer-profile.html',
    'public/feedback.html',
    'public/crop-prediction.html',
    'public/crop-details.html',
    'public/settings.html'
];

function addCSSLink(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if already added
        if (content.includes('mobile-responsiveness-fixes.css')) {
            console.log(`✓ ${filePath} - Already has mobile CSS link`);
            return;
        }
        
        // Find the </head> tag and insert before it
        const headCloseIndex = content.indexOf('</head>');
        if (headCloseIndex === -1) {
            console.log(`✗ ${filePath} - No </head> tag found`);
            return;
        }
        
        // Insert the CSS link before </head>
        const before = content.substring(0, headCloseIndex);
        const after = content.substring(headCloseIndex);
        const newContent = before + '    ' + CSS_LINK + '\n' + after;
        
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✓ ${filePath} - Mobile CSS link added successfully`);
    } catch (error) {
        console.log(`✗ ${filePath} - Error: ${error.message}`);
    }
}

console.log('\n🚀 Adding mobile responsiveness CSS to remaining pages...\n');

filesToUpdate.forEach(file => {
    addCSSLink(file);
});

console.log('\n✅ Process complete!\n');
console.log('Next steps:');
console.log('1. Test all pages on mobile devices (375px, 768px, 1920px)');
console.log('2. Verify no horizontal scroll on any page');
console.log('3. Check that all interactive elements are touch-friendly (44px min)');
console.log('4. Commit changes to git');
console.log('\n📖 Documentation: docs/MOBILE_RESPONSIVENESS_IMPLEMENTATION_GUIDE.md\n');
