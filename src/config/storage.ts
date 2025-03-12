import { Storage } from '@google-cloud/storage';
import { environment } from './environment';

export class StorageService {
  private static instance: StorageService;
  private storage: Storage;

  private constructor() {
    this.storage = new Storage({
      projectId: environment.gcp.projectId
    });
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async listBuckets() {
    const [buckets] = await this.storage.getBuckets();
    console.log('Google Cloud Storage buckets:');
    buckets.forEach(bucket => {
      console.log(`- ${bucket.name}`);
    });
  }

  getBucket() {
    return this.storage.bucket(environment.gcp.bucketName);
  }
} 