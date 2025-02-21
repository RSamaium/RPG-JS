import { buildSequentially } from './common';
import process from 'process';
import { packages } from './config';

// Main development function
async function main() {
    await buildSequentially(packages('dev'));
}

main().catch(error => {
    console.error('❌ Development process error:', error);
    process.exit(1);
}); 