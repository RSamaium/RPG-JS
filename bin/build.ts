import { buildSequentially } from './common';
import { packages } from './config';

// Main build function
async function main() {
    await buildSequentially(packages('build'));
}

main().catch(error => {
    console.error('❌ Build process error:', error);
    process.exit(1);
}); 