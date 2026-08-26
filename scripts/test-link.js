// Run with: node scripts/test-link.js <url>
// Example: node scripts/test-link.js https://moneyletter.com/budget-calculator/

const { fetchMetadata } = require('../src/services/metadataService');

const targetUrl = process.argv[2] || 'https://moneyletter.com/budget-calculator/';

console.log(`\n🔍 Inspecting metadata for: ${targetUrl}\n`);

fetchMetadata(targetUrl)
  .then((data) => {
    console.log('✅ Extracted Metadata:');
    console.log('--------------------------------------------------');
    console.log(`📌 Title:       ${data.title || '(None)'}`);
    console.log(`🌐 Domain:      ${data.domain || '(None)'}`);
    console.log(`🖼️  Image:       ${data.image || '(No OpenGraph image)'}`);
    console.log(`🌟 Favicon:     ${data.favicon || '(None)'}`);
    console.log(`📝 Description: ${data.description || '(None)'}`);
    console.log(`🔗 Full URL:    ${data.url}`);
    console.log('--------------------------------------------------\n');
  })
  .catch((err) => {
    console.error('❌ Error fetching metadata:', err.message);
  });
