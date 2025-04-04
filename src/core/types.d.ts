export interface BundleMetadata {
  chunks: {
    [id: string]: BundleChunk;
  };
}

export interface BundleChunk {
  id: string;
  isEntry: boolean;
  // all sizes in bytes
  size: number;
  sizeGzip: number;
  sizeBrotli: number;
  contents: { [fileID: string]: BundleContent };
}

export interface BundleContent {
  /** only present if node_module */
  packageName?: string;
  /** location on disk */
  filePath: string;
  /** in bytes */
  size: number;
}
