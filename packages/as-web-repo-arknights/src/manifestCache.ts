import { createStore, getMany, setMany } from 'idb-keyval';
import type { ResourceManifest } from './fbs';

const store = createStore('as-web-repo-arknights', 'data');

export class ManifestCache {
  private readonly nameKey: string;
  private readonly dataKey: string;

  constructor(baseKey: string) {
    this.nameKey = `${baseKey}.manifest_name`;
    this.dataKey = `${baseKey}.manifest_data`;
  }

  async get(): Promise<{ name: string | undefined; data: ResourceManifest | undefined }> {
    const [name, data] = await getMany([this.nameKey, this.dataKey], store);
    return { name, data };
  }

  async set({ name, data }: { name: string; data: ResourceManifest }): Promise<void> {
    await setMany(
      [
        [this.nameKey, name],
        [this.dataKey, data],
      ],
      store,
    );
  }
}
