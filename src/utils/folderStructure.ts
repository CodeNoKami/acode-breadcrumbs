// Define interfaces matching Acode's internal Tree schema
export interface AcodeTree {
  name: string;
  url: string;
  path: string;
  isDirectory: boolean;
  children?: AcodeTree[];
  parent?: AcodeTree;
  isConnected: boolean;
}

// Explicit type for the injected Acode fileList manager function
export type GetFileListFn = () => Promise<AcodeTree[]>;

/**
 * Retrieves a deep clone of the hierarchical structure of all open workspace folders.
 *
 * @param getFileList The dynamically injected 'fileList' module from acode.require('fileList')
 */
export async function getCurrentFolderStructure(
  getFileList: GetFileListFn,
): Promise<AcodeTree[] | null> {
  try {
    // 1. Fetch the active tree structure from Acode's core runtime
    const folderTrees: AcodeTree[] = await getFileList();

    if (!folderTrees || folderTrees.length === 0) {
      console.log("No folders are currently open in the workspace.");
      return null;
    }

    // 2. Return a safe deep clone to avoid mutating internal application state
    // Note: If you need to keep reference loops like tree.parent, use a custom recursive cloner.
    console.log(JSON.parse(JSON.stringify(folderTrees)) as AcodeTree[]);
    return JSON.parse(JSON.stringify(folderTrees)) as AcodeTree[];
  } catch (error) {
    console.error(
      "Failed to retrieve Acode workspace folder structure:",
      error,
    );
    return null;
  }
}
