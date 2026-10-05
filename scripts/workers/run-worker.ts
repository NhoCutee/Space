import { startImageWorker } from '../../src/lib/media';

console.log('==============================================');
console.log('SPACES — DEDICATED IMAGE PROCESSING WORKER');
console.log('Consuming from RabbitMQ queue');
console.log('Generating 5 Sharp variants (Large, Med, Small, Thumb, LocalThumb)');
console.log('Uploading processed variants to Cloudinary');
console.log('Cleaning temporary staging files');
console.log('==============================================');

startImageWorker()
  .then(() => {
    console.log('[ImageWorker] Worker daemon active and waiting for jobs.');
  })
  .catch((err) => {
    console.error('[ImageWorker] Fatal error starting worker:', err);
    process.exit(1);
  });
