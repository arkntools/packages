import { Unzip, UnzipInflate } from 'fflate';

export const unzipSingle = async (
  data: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> => {
  const files: Blob[] = [];

  const archive = new Unzip(file => {
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    file.ondata = (error, chunk, final) => {
      if (error) throw error;
      chunks.push(chunk);
      if (final) files.push(new Blob(chunks));
    };
    file.start();
  });

  archive.register(UnzipInflate);
  archive.push(data, true);

  if (files.length !== 1) throw new Error('Expected a single-file ZIP archive');

  return new Uint8Array(await files[0]!.arrayBuffer());
};
